-- ============================================================================
-- MIGRATION : CARTE FIDÉLITÉ UNIVERSELLE — ADDITIF STRICT
-- Branche   : feat/carte-fidelite-universelle
-- Rollback  : sql/rollback_fidelite_universelle.sql
-- Tests     : sql/test_post_migration_fidelite.sql
--
-- RÈGLES :
--   • Zéro modification de tables existantes sauf colonnes NULLABLE avec défaut safe
--   • Zéro modification de RPC existantes (reserver_bon intacte)
--   • Double garde-fou : feature flag ENV + palier = 'pro' + programme.actif = true
--   • La colonne commerces.palier est de type TEXT, valeur Pro = 'pro'
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Colonne telephone sur users ────────────────────────────────────────────
-- NULLABLE, pas de DEFAULT, zéro impact sur les lignes existantes
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS telephone VARCHAR(15) NULL;

-- Index partiel (n'indexe que les valeurs non-NULL → performances + unicité sans conflit)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_telephone_unique
  ON users(telephone) WHERE telephone IS NOT NULL;

-- ── 2. Table users_light ──────────────────────────────────────────────────────
-- Clients "caisse" non-BONMOMENT identifiés par leur 06/07
CREATE TABLE IF NOT EXISTS users_light (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telephone              VARCHAR(15) NOT NULL UNIQUE,
  prenom                 VARCHAR(100) NULL,
  consentement_donnees   TIMESTAMP NOT NULL DEFAULT NOW(),
  consentement_sms       BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_commerce_id UUID REFERENCES commerces(id) ON DELETE SET NULL,
  upgraded_to_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at             TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE users_light ENABLE ROW LEVEL SECURITY;

-- Aucun accès direct : toutes les opérations passent par les RPC SECURITY DEFINER
CREATE POLICY "users_light_no_direct_access"
  ON users_light FOR ALL USING (false);

-- ── 3. Table programmes_fidelite ──────────────────────────────────────────────
-- Un seul programme par commerce (PK = commerce_id)
CREATE TABLE IF NOT EXISTS programmes_fidelite (
  commerce_id            UUID PRIMARY KEY REFERENCES commerces(id) ON DELETE CASCADE,
  seuil_passages         INTEGER NOT NULL DEFAULT 10
                           CHECK (seuil_passages BETWEEN 1 AND 1000),
  description_recompense TEXT NOT NULL DEFAULT 'Récompense à définir',
  regle_tampons          TEXT NULL, -- ex: "1 tampon par tranche de 50€" — purement informatif
  actif                  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE programmes_fidelite ENABLE ROW LEVEL SECURITY;

CREATE POLICY "programmes_fidelite_owner_read"
  ON programmes_fidelite FOR SELECT
  USING (commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid()));

CREATE POLICY "programmes_fidelite_owner_write"
  ON programmes_fidelite FOR ALL
  USING (commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid()));

-- ── 4. Table cartes_fidelite ──────────────────────────────────────────────────
-- Option C : seuil figé par carte à la création (modification du programme
-- ne casse pas les clients existants)
CREATE TABLE IF NOT EXISTS cartes_fidelite (
  id                                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commerce_id                            UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  client_type                            VARCHAR(10) NOT NULL
                                           CHECK (client_type IN ('full', 'light')),
  user_id                                UUID NULL REFERENCES users(id) ON DELETE CASCADE,
  user_light_id                          UUID NULL REFERENCES users_light(id) ON DELETE CASCADE,
  -- Seuil et récompense figés à la création de la carte
  seuil_passages_carte                   INTEGER NOT NULL,
  description_recompense_carte           TEXT NOT NULL,
  -- Compteurs
  nb_passages_total                      INTEGER NOT NULL DEFAULT 0,
  nb_passages_depuis_derniere_recompense INTEGER NOT NULL DEFAULT 0,
  nb_recompenses_debloquees              INTEGER NOT NULL DEFAULT 0,
  recompense_en_attente                  BOOLEAN NOT NULL DEFAULT FALSE,
  derniere_activite                      TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at                             TIMESTAMP NOT NULL DEFAULT NOW(),
  -- Contrainte d'exclusivité client_type / identifiant
  CHECK (
    (client_type = 'full'  AND user_id IS NOT NULL AND user_light_id IS NULL)
    OR
    (client_type = 'light' AND user_light_id IS NOT NULL AND user_id IS NULL)
  ),
  -- Un client ne peut avoir qu'une seule carte par commerce
  UNIQUE(commerce_id, user_id),
  UNIQUE(commerce_id, user_light_id)
);

CREATE INDEX IF NOT EXISTS idx_cartes_fidelite_commerce
  ON cartes_fidelite(commerce_id, derniere_activite DESC);
CREATE INDEX IF NOT EXISTS idx_cartes_fidelite_user
  ON cartes_fidelite(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cartes_fidelite_recompense
  ON cartes_fidelite(commerce_id) WHERE recompense_en_attente = TRUE;

ALTER TABLE cartes_fidelite ENABLE ROW LEVEL SECURITY;

-- Client voit ses propres cartes
CREATE POLICY "cartes_fidelite_client_read"
  ON cartes_fidelite FOR SELECT USING (user_id = auth.uid());

-- Commerçant voit les cartes de son commerce
CREATE POLICY "cartes_fidelite_commerce_read"
  ON cartes_fidelite FOR SELECT
  USING (commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid()));

-- Aucun INSERT/UPDATE direct : passe obligatoirement par les RPC SECURITY DEFINER
CREATE POLICY "cartes_fidelite_no_direct_insert"
  ON cartes_fidelite FOR INSERT WITH CHECK (false);
CREATE POLICY "cartes_fidelite_no_direct_update"
  ON cartes_fidelite FOR UPDATE USING (false);

-- Le client peut supprimer sa propre carte (droit RGPD)
CREATE POLICY "cartes_fidelite_client_delete"
  ON cartes_fidelite FOR DELETE USING (user_id = auth.uid());

-- ── 5. Table passages_fidelite ────────────────────────────────────────────────
-- Un passage multi-tampons crée N lignes partageant le même passage_group_id
-- → permet l'annulation atomique de tout le groupe
CREATE TABLE IF NOT EXISTS passages_fidelite (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carte_fidelite_id   UUID NOT NULL REFERENCES cartes_fidelite(id) ON DELETE CASCADE,
  bon_valide_id       UUID NULL REFERENCES reservations(id) ON DELETE SET NULL,
  mode_identification VARCHAR(20) NOT NULL
                        CHECK (mode_identification IN ('qr', 'code_6', 'telephone', 'manuel', 'recompense_remise')),
  -- Toutes les lignes d'un même acte multi-tampons partagent ce group_id
  passage_group_id    UUID NOT NULL DEFAULT uuid_generate_v4(),
  annule              BOOLEAN NOT NULL DEFAULT FALSE,
  annule_at           TIMESTAMP NULL,
  commentaire         TEXT NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_passages_carte
  ON passages_fidelite(carte_fidelite_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_passages_group
  ON passages_fidelite(passage_group_id);

ALTER TABLE passages_fidelite ENABLE ROW LEVEL SECURITY;

-- Client voit ses passages (via ses cartes)
CREATE POLICY "passages_client_read"
  ON passages_fidelite FOR SELECT
  USING (carte_fidelite_id IN (
    SELECT id FROM cartes_fidelite WHERE user_id = auth.uid()
  ));

-- Commerçant voit les passages de son commerce
CREATE POLICY "passages_commerce_read"
  ON passages_fidelite FOR SELECT
  USING (carte_fidelite_id IN (
    SELECT cf.id FROM cartes_fidelite cf
    JOIN commerces c ON c.id = cf.commerce_id
    WHERE c.owner_id = auth.uid()
  ));

-- Aucune écriture directe : passe par les RPC SECURITY DEFINER
CREATE POLICY "passages_no_direct_write"
  ON passages_fidelite FOR INSERT WITH CHECK (false);

-- ── 6. Table fidelite_flags_antifraude ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fidelite_flags_antifraude (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commerce_id UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  type_flag   VARCHAR(50) NOT NULL,
  details     JSONB NOT NULL DEFAULT '{}',
  traite      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE fidelite_flags_antifraude ENABLE ROW LEVEL SECURITY;

-- Accès admin uniquement (géré hors RLS, via service_role)
CREATE POLICY "flags_admin_only"
  ON fidelite_flags_antifraude FOR ALL USING (false);

-- ── 7. Fonction utilitaire palier ─────────────────────────────────────────────
-- CORRECTION CRITIQUE : colonne réelle = 'palier' (TEXT), pas 'palier_abonnement'
-- Valeurs possibles : 'decouverte' | 'essentiel' | 'pro' | NULL
-- La fidélité est réservée au palier 'pro' avec abonnement_actif = TRUE
CREATE OR REPLACE FUNCTION peut_utiliser_fidelite(p_commerce_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_palier TEXT;
  v_actif  BOOLEAN;
BEGIN
  SELECT palier, abonnement_actif
    INTO v_palier, v_actif
    FROM commerces
   WHERE id = p_commerce_id;

  -- NULLIF safety : si commerce inexistant, retourne FALSE
  RETURN COALESCE(v_actif, FALSE) = TRUE AND v_palier = 'pro';
END;
$$;

-- ── 8. Rate limit ─────────────────────────────────────────────────────────────
-- Seuil 30 lignes/minute (multi-tampons : un passage peut créer jusqu'à 10 lignes)
CREATE OR REPLACE FUNCTION check_rate_limit_fidelite(p_commerce_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
    FROM passages_fidelite pf
    JOIN cartes_fidelite cf ON cf.id = pf.carte_fidelite_id
   WHERE cf.commerce_id = p_commerce_id
     AND pf.created_at > NOW() - INTERVAL '1 minute'
     AND pf.annule = FALSE;
  RETURN v_count < 30;
END;
$$;

-- ── 9. RPC principale : enregistrer_passage_fidelite ─────────────────────────
-- p_nb_tampons : nombre de tampons à ajouter (1 par défaut, max 10)
-- p_mode_consultation : si TRUE, lit sans écrire (aucun tampon ajouté)
CREATE OR REPLACE FUNCTION enregistrer_passage_fidelite(
  p_commerce_id        UUID,
  p_mode_identification VARCHAR(20),
  p_identifier_value   TEXT,
  p_prenom_optionnel   VARCHAR(100) DEFAULT NULL,
  p_mode_consultation  BOOLEAN      DEFAULT FALSE,
  p_nb_tampons         INTEGER      DEFAULT 1
)
RETURNS TABLE(
  success                        BOOLEAN,
  message                        TEXT,
  carte_id                       UUID,
  client_prenom                  TEXT,
  client_type                    VARCHAR(10),
  bon_valide                     BOOLEAN,
  bon_code_validation            TEXT,
  nb_passages_total              INTEGER,
  nb_passages_depuis_recompense  INTEGER,
  seuil_passages                 INTEGER,
  recompense_debloquee           BOOLEAN,
  recompense_en_attente          BOOLEAN,
  description_recompense         TEXT,
  passage_id                     UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id              UUID;
  v_user_light_id        UUID;
  v_client_type          VARCHAR(10);
  v_client_prenom        TEXT;
  v_carte_id             UUID;
  v_telephone            VARCHAR(15);
  v_seuil                INTEGER;
  v_description          TEXT;
  v_seuil_carte          INTEGER;
  v_description_carte    TEXT;
  v_programme_actif      BOOLEAN;
  v_nb_passages          INTEGER;
  v_nb_depuis_recompense INTEGER;
  v_bon_reservation_id   UUID;
  v_bon_code             TEXT;
  v_recompense_debloquee BOOLEAN := FALSE;
  v_recompense_en_attente BOOLEAN := FALSE;
  v_passage_id           UUID;
  v_nb_light_recents     INTEGER;
  v_group_id             UUID;
  i                      INTEGER;
  v_nb_recompenses_ici   INTEGER;
  v_reste_apres          INTEGER;
BEGIN
  -- Garde-fou 1 : palier Pro + abonnement actif
  IF NOT peut_utiliser_fidelite(p_commerce_id) THEN
    RETURN QUERY SELECT FALSE, 'Fidélité non disponible pour ce palier'::TEXT,
      NULL::UUID, NULL::TEXT, NULL::VARCHAR(10), FALSE, NULL::TEXT,
      0, 0, 0, FALSE, FALSE, NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Garde-fou 2 : rate limit (sauf mode consultation)
  IF NOT p_mode_consultation AND NOT check_rate_limit_fidelite(p_commerce_id) THEN
    RETURN QUERY SELECT FALSE, 'Trop de validations récentes, réessaie dans 1 minute'::TEXT,
      NULL::UUID, NULL::TEXT, NULL::VARCHAR(10), FALSE, NULL::TEXT,
      0, 0, 0, FALSE, FALSE, NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Garde-fou 3 : programme actif
  SELECT pf.seuil_passages, pf.description_recompense, pf.actif
    INTO v_seuil, v_description, v_programme_actif
    FROM programmes_fidelite pf
   WHERE pf.commerce_id = p_commerce_id;

  IF NOT FOUND OR v_programme_actif = FALSE THEN
    RETURN QUERY SELECT FALSE, 'Programme fidélité non configuré ou inactif'::TEXT,
      NULL::UUID, NULL::TEXT, NULL::VARCHAR(10), FALSE, NULL::TEXT,
      0, 0, 0, FALSE, FALSE, NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- ── Résolution de l'identifiant ──────────────────────────────────────────
  IF p_mode_identification = 'qr' THEN
    -- Identifier = reservation_id (UUID)
    SELECT r.user_id, u.nom
      INTO v_user_id, v_client_prenom
      FROM reservations r
      JOIN users u ON u.id = r.user_id
     WHERE r.id = p_identifier_value::UUID;

    IF v_user_id IS NULL THEN
      RETURN QUERY SELECT FALSE, 'Utilisateur introuvable'::TEXT,
        NULL::UUID, NULL::TEXT, NULL::VARCHAR(10), FALSE, NULL::TEXT,
        0, 0, v_seuil, FALSE, FALSE, v_description, NULL::UUID;
      RETURN;
    END IF;
    v_client_type := 'full';

  ELSIF p_mode_identification = 'code_6' THEN
    SELECT r.user_id, u.nom
      INTO v_user_id, v_client_prenom
      FROM reservations r
      JOIN users u ON u.id = r.user_id
     WHERE r.code_validation = p_identifier_value
       AND r.statut = 'reservee';

    IF v_user_id IS NULL THEN
      RETURN QUERY SELECT FALSE, 'Code invalide ou bon déjà utilisé'::TEXT,
        NULL::UUID, NULL::TEXT, NULL::VARCHAR(10), FALSE, NULL::TEXT,
        0, 0, v_seuil, FALSE, FALSE, v_description, NULL::UUID;
      RETURN;
    END IF;
    v_client_type := 'full';

  ELSIF p_mode_identification = 'telephone' THEN
    -- Normalisation : on ne garde que les chiffres
    v_telephone := regexp_replace(p_identifier_value, '[^0-9]', '', 'g');

    IF NOT (v_telephone ~ '^(0[67])[0-9]{8}$') THEN
      RETURN QUERY SELECT FALSE, 'Numéro invalide — doit commencer par 06 ou 07'::TEXT,
        NULL::UUID, NULL::TEXT, NULL::VARCHAR(10), FALSE, NULL::TEXT,
        0, 0, v_seuil, FALSE, FALSE, v_description, NULL::UUID;
      RETURN;
    END IF;

    -- Cherche d'abord un user BONMOMENT avec ce numéro
    SELECT id, nom INTO v_user_id, v_client_prenom
      FROM users WHERE telephone = v_telephone;

    IF v_user_id IS NOT NULL THEN
      v_client_type := 'full';
    ELSE
      -- Cherche un user_light
      SELECT id, prenom INTO v_user_light_id, v_client_prenom
        FROM users_light WHERE telephone = v_telephone;

      IF v_user_light_id IS NULL THEN
        -- Inconnu : en mode consultation on ne crée rien
        IF p_mode_consultation THEN
          RETURN QUERY SELECT FALSE, 'Client inconnu'::TEXT,
            NULL::UUID, NULL::TEXT, NULL::VARCHAR(10), FALSE, NULL::TEXT,
            0, 0, v_seuil, FALSE, FALSE, v_description, NULL::UUID;
          RETURN;
        END IF;

        -- Création user_light avec consentement enregistré
        INSERT INTO users_light (telephone, prenom, created_by_commerce_id, consentement_donnees)
          VALUES (v_telephone, p_prenom_optionnel, p_commerce_id, NOW())
          RETURNING id INTO v_user_light_id;
        v_client_prenom := p_prenom_optionnel;

        -- Anti-fraude : plus de 5 créations user_light en 1h pour ce commerce
        SELECT COUNT(*) INTO v_nb_light_recents
          FROM users_light
         WHERE created_by_commerce_id = p_commerce_id
           AND created_at > NOW() - INTERVAL '1 hour';

        IF v_nb_light_recents >= 5 THEN
          INSERT INTO fidelite_flags_antifraude (commerce_id, type_flag, details)
            VALUES (p_commerce_id, 'mass_light_creation',
              jsonb_build_object('count_1h', v_nb_light_recents));
        END IF;
      END IF;
      v_client_type := 'light';
    END IF;

  ELSE
    RETURN QUERY SELECT FALSE, 'Mode identification inconnu'::TEXT,
      NULL::UUID, NULL::TEXT, NULL::VARCHAR(10), FALSE, NULL::TEXT,
      0, 0, v_seuil, FALSE, FALSE, v_description, NULL::UUID;
    RETURN;
  END IF;

  -- ── Récupération ou création de la carte ─────────────────────────────────
  IF v_client_type = 'full' THEN
    SELECT id, seuil_passages_carte, description_recompense_carte
      INTO v_carte_id, v_seuil_carte, v_description_carte
      FROM cartes_fidelite
     WHERE commerce_id = p_commerce_id AND user_id = v_user_id;

    IF v_carte_id IS NULL THEN
      IF p_mode_consultation THEN
        RETURN QUERY SELECT TRUE, 'Nouveau client'::TEXT,
          NULL::UUID, v_client_prenom, v_client_type, FALSE, NULL::TEXT,
          0, 0, v_seuil, FALSE, FALSE, v_description, NULL::UUID;
        RETURN;
      END IF;
      INSERT INTO cartes_fidelite
        (commerce_id, client_type, user_id, seuil_passages_carte, description_recompense_carte)
        VALUES (p_commerce_id, 'full', v_user_id, v_seuil, v_description)
        RETURNING id INTO v_carte_id;
      v_seuil_carte := v_seuil;
      v_description_carte := v_description;
    END IF;

  ELSE -- light
    SELECT id, seuil_passages_carte, description_recompense_carte
      INTO v_carte_id, v_seuil_carte, v_description_carte
      FROM cartes_fidelite
     WHERE commerce_id = p_commerce_id AND user_light_id = v_user_light_id;

    IF v_carte_id IS NULL THEN
      IF p_mode_consultation THEN
        RETURN QUERY SELECT TRUE, 'Nouveau client'::TEXT,
          NULL::UUID, v_client_prenom, v_client_type, FALSE, NULL::TEXT,
          0, 0, v_seuil, FALSE, FALSE, v_description, NULL::UUID;
        RETURN;
      END IF;
      INSERT INTO cartes_fidelite
        (commerce_id, client_type, user_light_id, seuil_passages_carte, description_recompense_carte)
        VALUES (p_commerce_id, 'light', v_user_light_id, v_seuil, v_description)
        RETURNING id INTO v_carte_id;
      v_seuil_carte := v_seuil;
      v_description_carte := v_description;
    END IF;
  END IF;

  -- ── Mode consultation : lecture pure, aucune écriture ────────────────────
  IF p_mode_consultation THEN
    SELECT cf.nb_passages_total, cf.nb_passages_depuis_derniere_recompense, cf.recompense_en_attente
      INTO v_nb_passages, v_nb_depuis_recompense, v_recompense_en_attente
      FROM cartes_fidelite cf WHERE cf.id = v_carte_id;

    RETURN QUERY SELECT TRUE, 'Consultation'::TEXT,
      v_carte_id, v_client_prenom, v_client_type, FALSE, NULL::TEXT,
      v_nb_passages, v_nb_depuis_recompense, v_seuil_carte,
      FALSE, v_recompense_en_attente, v_description_carte, NULL::UUID;
    RETURN;
  END IF;

  -- ── Vérification bon actif (clients 'full' uniquement) ───────────────────
  IF v_client_type = 'full' THEN
    SELECT r.id, r.code_validation
      INTO v_bon_reservation_id, v_bon_code
      FROM reservations r
      JOIN offres o ON o.id = r.offre_id
     WHERE r.user_id = v_user_id
       AND o.commerce_id = p_commerce_id
       AND r.statut = 'reservee'
       AND o.date_fin > NOW()
       AND o.statut = 'active'
     ORDER BY r.created_at DESC
     LIMIT 1;

    -- En mode code_6 : ne valide que si le code correspond
    IF p_mode_identification = 'code_6' THEN
      IF v_bon_code IS DISTINCT FROM p_identifier_value THEN
        v_bon_reservation_id := NULL;
        v_bon_code := NULL;
      END IF;
    END IF;

    -- Marque le bon comme utilisé
    IF v_bon_reservation_id IS NOT NULL THEN
      UPDATE reservations
         SET statut = 'utilisee', utilise_at = NOW()
       WHERE id = v_bon_reservation_id;
    END IF;
  END IF;

  -- ── Validation du nombre de tampons ──────────────────────────────────────
  IF p_nb_tampons < 1 OR p_nb_tampons > 10 THEN
    RETURN QUERY SELECT FALSE, 'Nombre de tampons invalide (entre 1 et 10)'::TEXT,
      NULL::UUID, NULL::TEXT, NULL::VARCHAR(10), FALSE, NULL::TEXT,
      0, 0, 0, FALSE, FALSE, NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- ── Incrémentation des compteurs ─────────────────────────────────────────
  UPDATE cartes_fidelite
     SET nb_passages_total                      = nb_passages_total + p_nb_tampons,
         nb_passages_depuis_derniere_recompense = nb_passages_depuis_derniere_recompense + p_nb_tampons,
         derniere_activite                      = NOW()
   WHERE id = v_carte_id
   RETURNING nb_passages_total, nb_passages_depuis_derniere_recompense
    INTO v_nb_passages, v_nb_depuis_recompense;

  -- ── Gestion du franchissement de seuil (supporte plusieurs récompenses d'un coup) ──
  IF v_nb_depuis_recompense >= v_seuil_carte THEN
    v_nb_recompenses_ici := FLOOR(v_nb_depuis_recompense::NUMERIC / v_seuil_carte::NUMERIC);
    v_reste_apres        := v_nb_depuis_recompense - (v_nb_recompenses_ici * v_seuil_carte);

    UPDATE cartes_fidelite
       SET nb_passages_depuis_derniere_recompense = v_reste_apres,
           nb_recompenses_debloquees              = nb_recompenses_debloquees + v_nb_recompenses_ici,
           recompense_en_attente                  = TRUE
     WHERE id = v_carte_id;

    v_nb_depuis_recompense  := v_reste_apres;
    v_recompense_debloquee  := TRUE;
    v_recompense_en_attente := TRUE;
  ELSE
    SELECT cf.recompense_en_attente INTO v_recompense_en_attente
      FROM cartes_fidelite cf WHERE cf.id = v_carte_id;
  END IF;

  -- ── Insertion des lignes passages_fidelite (N lignes = N tampons) ─────────
  -- Toutes partagent le même passage_group_id pour annulation atomique
  v_group_id := uuid_generate_v4();

  FOR i IN 1..p_nb_tampons LOOP
    INSERT INTO passages_fidelite
      (carte_fidelite_id, bon_valide_id, mode_identification, passage_group_id)
      VALUES (
        v_carte_id,
        CASE WHEN i = 1 THEN v_bon_reservation_id ELSE NULL END,
        p_mode_identification,
        v_group_id
      );
  END LOOP;

  -- On retourne le passage_group_id dans la colonne passage_id
  -- pour permettre l'annulation atomique de tout le groupe depuis le front
  v_passage_id := v_group_id;

  RETURN QUERY SELECT TRUE, 'Passage enregistré'::TEXT,
    v_carte_id, v_client_prenom, v_client_type,
    (v_bon_reservation_id IS NOT NULL), v_bon_code,
    v_nb_passages, v_nb_depuis_recompense, v_seuil_carte,
    v_recompense_debloquee, v_recompense_en_attente,
    v_description_carte, v_passage_id;
END;
$$;

-- ── 10. RPC : annuler_passage_fidelite ───────────────────────────────────────
-- Accepte un passage_group_id : annule TOUS les tampons du groupe
-- Restaure le bon si applicable + recalcule les récompenses
CREATE OR REPLACE FUNCTION annuler_passage_fidelite(p_passage_group_id UUID)
RETURNS TABLE(
  success           BOOLEAN,
  message           TEXT,
  nb_tampons_annules INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_carte_id              UUID;
  v_bon_reservation_id    UUID;
  v_owner_id              UUID;
  v_nb_lignes             INTEGER;
  v_nb_deja_annulees      INTEGER;
  v_nb_total_a_retirer    INTEGER;
  v_seuil                 INTEGER;
  v_nb_depuis             INTEGER;
  v_nb_recompenses_a_retirer INTEGER := 0;
  v_nouveau_nb_depuis     INTEGER;
BEGIN
  -- Récupération des infos du groupe (ou de la ligne si UUID = passage.id)
  SELECT
    (SELECT carte_fidelite_id FROM passages_fidelite
      WHERE passage_group_id = p_passage_group_id OR id = p_passage_group_id
      LIMIT 1),
    (SELECT bon_valide_id FROM passages_fidelite
      WHERE (passage_group_id = p_passage_group_id OR id = p_passage_group_id)
        AND bon_valide_id IS NOT NULL
      LIMIT 1),
    (SELECT c.owner_id
       FROM passages_fidelite pf
       JOIN cartes_fidelite cf ON cf.id = pf.carte_fidelite_id
       JOIN commerces c ON c.id = cf.commerce_id
      WHERE pf.passage_group_id = p_passage_group_id OR pf.id = p_passage_group_id
      LIMIT 1),
    (SELECT COUNT(*) FROM passages_fidelite
      WHERE passage_group_id = p_passage_group_id OR id = p_passage_group_id),
    (SELECT COUNT(*) FROM passages_fidelite
      WHERE (passage_group_id = p_passage_group_id OR id = p_passage_group_id)
        AND annule = TRUE)
    INTO v_carte_id, v_bon_reservation_id, v_owner_id, v_nb_lignes, v_nb_deja_annulees;

  IF v_carte_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Passage introuvable'::TEXT, 0; RETURN;
  END IF;
  IF v_owner_id IS DISTINCT FROM auth.uid() THEN
    RETURN QUERY SELECT FALSE, 'Non autorisé'::TEXT, 0; RETURN;
  END IF;
  IF v_nb_deja_annulees >= v_nb_lignes THEN
    RETURN QUERY SELECT FALSE, 'Passage déjà annulé'::TEXT, 0; RETURN;
  END IF;

  v_nb_total_a_retirer := v_nb_lignes - v_nb_deja_annulees;

  -- Annulation de toutes les lignes non encore annulées
  UPDATE passages_fidelite
     SET annule = TRUE, annule_at = NOW()
   WHERE (passage_group_id = p_passage_group_id OR id = p_passage_group_id)
     AND annule = FALSE;

  -- État actuel de la carte
  SELECT seuil_passages_carte, nb_passages_depuis_derniere_recompense
    INTO v_seuil, v_nb_depuis
    FROM cartes_fidelite WHERE id = v_carte_id;

  -- Calcul du nouveau nb_depuis (peut franchir le seuil à l'envers)
  IF v_nb_total_a_retirer > v_nb_depuis THEN
    v_nb_recompenses_a_retirer :=
      CEIL((v_nb_total_a_retirer - v_nb_depuis)::NUMERIC / v_seuil::NUMERIC);
    v_nouveau_nb_depuis :=
      (v_nb_recompenses_a_retirer * v_seuil) - (v_nb_total_a_retirer - v_nb_depuis);
  ELSE
    v_nb_recompenses_a_retirer := 0;
    v_nouveau_nb_depuis := v_nb_depuis - v_nb_total_a_retirer;
  END IF;

  UPDATE cartes_fidelite
     SET nb_passages_total                      = GREATEST(0, nb_passages_total - v_nb_total_a_retirer),
         nb_passages_depuis_derniere_recompense = GREATEST(0, v_nouveau_nb_depuis),
         nb_recompenses_debloquees              = GREATEST(0, nb_recompenses_debloquees - v_nb_recompenses_a_retirer),
         recompense_en_attente                  = CASE
           WHEN v_nb_recompenses_a_retirer > 0 THEN FALSE
           ELSE recompense_en_attente
         END
   WHERE id = v_carte_id;

  -- Restauration du bon si validé dans ce passage
  IF v_bon_reservation_id IS NOT NULL THEN
    UPDATE reservations
       SET statut = 'reservee', utilise_at = NULL
     WHERE id = v_bon_reservation_id;
  END IF;

  RETURN QUERY SELECT TRUE, 'Passage annulé'::TEXT, v_nb_total_a_retirer;
END;
$$;

-- ── 11. RPC : ajuster_tampons_manuel ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION ajuster_tampons_manuel(
  p_carte_id   UUID,
  p_nb_tampons INTEGER,
  p_commentaire TEXT
)
RETURNS TABLE(
  success       BOOLEAN,
  message       TEXT,
  nouveau_total INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id      UUID;
  v_seuil         INTEGER;
  v_nb_depuis     INTEGER;
  v_nouveau_total INTEGER;
BEGIN
  SELECT c.owner_id, cf.seuil_passages_carte, cf.nb_passages_depuis_derniere_recompense
    INTO v_owner_id, v_seuil, v_nb_depuis
    FROM cartes_fidelite cf
    JOIN commerces c ON c.id = cf.commerce_id
   WHERE cf.id = p_carte_id;

  IF v_owner_id IS DISTINCT FROM auth.uid() THEN
    RETURN QUERY SELECT FALSE, 'Non autorisé'::TEXT, 0; RETURN;
  END IF;
  IF ABS(p_nb_tampons) > 50 THEN
    RETURN QUERY SELECT FALSE, 'Ajustement trop important (max ±50)'::TEXT, 0; RETURN;
  END IF;

  UPDATE cartes_fidelite
     SET nb_passages_total                      = GREATEST(0, nb_passages_total + p_nb_tampons),
         nb_passages_depuis_derniere_recompense = GREATEST(0, nb_passages_depuis_derniere_recompense + p_nb_tampons),
         derniere_activite                      = NOW()
   WHERE id = p_carte_id
   RETURNING nb_passages_depuis_derniere_recompense INTO v_nouveau_total;

  -- Déclenchement récompense si seuil atteint
  IF v_nouveau_total >= v_seuil THEN
    UPDATE cartes_fidelite
       SET nb_passages_depuis_derniere_recompense = 0,
           nb_recompenses_debloquees              = nb_recompenses_debloquees + 1,
           recompense_en_attente                  = TRUE
     WHERE id = p_carte_id;
    v_nouveau_total := 0;
  END IF;

  -- Traçabilité
  INSERT INTO passages_fidelite (carte_fidelite_id, mode_identification, commentaire)
    VALUES (p_carte_id, 'manuel', p_commentaire);

  RETURN QUERY SELECT TRUE, 'Ajustement effectué'::TEXT, v_nouveau_total;
END;
$$;

-- ── 12. RPC : confirmer_recompense_remise ────────────────────────────────────
CREATE OR REPLACE FUNCTION confirmer_recompense_remise(p_carte_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE cartes_fidelite
     SET recompense_en_attente = FALSE
   WHERE id = p_carte_id
     AND commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid())
     AND recompense_en_attente = TRUE;

  IF FOUND THEN
    INSERT INTO passages_fidelite (
      carte_fidelite_id,
      mode_identification,
      passage_group_id,
      annule
    ) VALUES (
      p_carte_id,
      'recompense_remise',
      uuid_generate_v4(),
      FALSE
    );
  END IF;

  RETURN FOUND;
END;
$$;

-- ── 13. RPC : activer_carte_fidelite_client ───────────────────────────────────
-- Lie un 06/07 au compte BONMOMENT du client + fusionne les cartes_light existantes
CREATE OR REPLACE FUNCTION activer_carte_fidelite_client(p_telephone TEXT)
RETURNS TABLE(
  success           BOOLEAN,
  message           TEXT,
  cartes_recuperees INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id          UUID;
  v_telephone_norm   VARCHAR(15);
  v_user_light_id    UUID;
  v_cartes_count     INTEGER := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Non authentifié'::TEXT, 0; RETURN;
  END IF;

  v_telephone_norm := regexp_replace(p_telephone, '[^0-9]', '', 'g');
  IF NOT (v_telephone_norm ~ '^(0[67])[0-9]{8}$') THEN
    RETURN QUERY SELECT FALSE, 'Format invalide — numéro 06 ou 07 requis'::TEXT, 0; RETURN;
  END IF;

  -- Vérifie que le numéro n'est pas déjà pris par un autre compte
  IF EXISTS (SELECT 1 FROM users WHERE telephone = v_telephone_norm AND id <> v_user_id) THEN
    RETURN QUERY SELECT FALSE,
      'Ce numéro est déjà lié à un autre compte BONMOMENT. Contacte le support.'::TEXT, 0;
    RETURN;
  END IF;

  UPDATE users SET telephone = v_telephone_norm WHERE id = v_user_id;

  -- Fusion des cartes light si ce numéro existe en users_light
  SELECT id INTO v_user_light_id FROM users_light WHERE telephone = v_telephone_norm;

  IF v_user_light_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_cartes_count
      FROM cartes_fidelite WHERE user_light_id = v_user_light_id;

    -- Transfert sans conflit
    UPDATE cartes_fidelite
       SET user_id = v_user_id, user_light_id = NULL, client_type = 'full'
     WHERE user_light_id = v_user_light_id
       AND NOT EXISTS (
         SELECT 1 FROM cartes_fidelite cf2
          WHERE cf2.commerce_id = cartes_fidelite.commerce_id
            AND cf2.user_id = v_user_id
       );

    -- Fusion des cartes en conflit (même commerce)
    UPDATE cartes_fidelite cf_full
       SET nb_passages_total                      = cf_full.nb_passages_total + cf_light.nb_passages_total,
           nb_passages_depuis_derniere_recompense = cf_full.nb_passages_depuis_derniere_recompense
                                                    + cf_light.nb_passages_depuis_derniere_recompense,
           nb_recompenses_debloquees              = cf_full.nb_recompenses_debloquees
                                                    + cf_light.nb_recompenses_debloquees,
           recompense_en_attente                  = cf_full.recompense_en_attente
                                                    OR cf_light.recompense_en_attente
      FROM cartes_fidelite cf_light
     WHERE cf_full.user_id = v_user_id
       AND cf_light.user_light_id = v_user_light_id
       AND cf_full.commerce_id = cf_light.commerce_id;

    DELETE FROM cartes_fidelite WHERE user_light_id = v_user_light_id;
    UPDATE users_light SET upgraded_to_user_id = v_user_id WHERE id = v_user_light_id;
  END IF;

  RETURN QUERY SELECT TRUE, 'Carte fidélité activée'::TEXT, v_cartes_count;
END;
$$;

-- ── 14. RPC : desactiver_fidelite_client ─────────────────────────────────────
-- RGPD : supprime toutes les cartes + efface le téléphone du compte
CREATE OR REPLACE FUNCTION desactiver_fidelite_client()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN FALSE; END IF;

  DELETE FROM cartes_fidelite WHERE user_id = v_user_id;
  UPDATE users SET telephone = NULL WHERE id = v_user_id;
  RETURN TRUE;
END;
$$;

-- ── 15. RPC : modifier_telephone_client ──────────────────────────────────────
-- Changement de numéro pour un client existant + fusion des éventuelles cartes light
CREATE OR REPLACE FUNCTION modifier_telephone_client(p_nouveau_telephone TEXT)
RETURNS TABLE(
  success          BOOLEAN,
  message          TEXT,
  cartes_fusionnees INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id               UUID;
  v_ancien_telephone      VARCHAR(15);
  v_nouveau_telephone_norm VARCHAR(15);
  v_user_light_id         UUID;
  v_cartes_count          INTEGER := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Non authentifié'::TEXT, 0; RETURN;
  END IF;

  SELECT telephone INTO v_ancien_telephone FROM users WHERE id = v_user_id;
  IF v_ancien_telephone IS NULL THEN
    RETURN QUERY SELECT FALSE,
      'Pas de numéro actuel. Utilise "Activer ma carte" à la place.'::TEXT, 0;
    RETURN;
  END IF;

  v_nouveau_telephone_norm := regexp_replace(p_nouveau_telephone, '[^0-9]', '', 'g');
  IF NOT (v_nouveau_telephone_norm ~ '^(0[67])[0-9]{8}$') THEN
    RETURN QUERY SELECT FALSE, 'Format invalide — numéro 06 ou 07 requis'::TEXT, 0; RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM users WHERE telephone = v_nouveau_telephone_norm AND id <> v_user_id) THEN
    RETURN QUERY SELECT FALSE,
      'Ce numéro est déjà lié à un autre compte BONMOMENT. Contacte le support.'::TEXT, 0;
    RETURN;
  END IF;

  UPDATE users SET telephone = v_nouveau_telephone_norm WHERE id = v_user_id;

  SELECT id INTO v_user_light_id FROM users_light WHERE telephone = v_nouveau_telephone_norm;

  IF v_user_light_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_cartes_count
      FROM cartes_fidelite WHERE user_light_id = v_user_light_id;

    UPDATE cartes_fidelite
       SET user_id = v_user_id, user_light_id = NULL, client_type = 'full'
     WHERE user_light_id = v_user_light_id
       AND NOT EXISTS (
         SELECT 1 FROM cartes_fidelite cf2
          WHERE cf2.commerce_id = cartes_fidelite.commerce_id
            AND cf2.user_id = v_user_id
       );

    UPDATE cartes_fidelite cf_full
       SET nb_passages_total                      = cf_full.nb_passages_total + cf_light.nb_passages_total,
           nb_passages_depuis_derniere_recompense = cf_full.nb_passages_depuis_derniere_recompense
                                                    + cf_light.nb_passages_depuis_derniere_recompense,
           nb_recompenses_debloquees              = cf_full.nb_recompenses_debloquees
                                                    + cf_light.nb_recompenses_debloquees,
           recompense_en_attente                  = cf_full.recompense_en_attente
                                                    OR cf_light.recompense_en_attente
      FROM cartes_fidelite cf_light
     WHERE cf_full.user_id = v_user_id
       AND cf_light.user_light_id = v_user_light_id
       AND cf_full.commerce_id = cf_light.commerce_id;

    DELETE FROM cartes_fidelite WHERE user_light_id = v_user_light_id;
    UPDATE users_light SET upgraded_to_user_id = v_user_id WHERE id = v_user_light_id;
  END IF;

  RETURN QUERY SELECT TRUE,
    'Numéro mis à jour'::TEXT ||
    CASE WHEN v_cartes_count > 0
      THEN ' (' || v_cartes_count || ' carte(s) fusionnée(s))'
      ELSE ''
    END,
    v_cartes_count;
END;
$$;

-- ── 16. RPC : mettre_a_jour_programme_fidelite ───────────────────────────────
-- Option A : baisse de seuil débloque immédiatement les clients éligibles
CREATE OR REPLACE FUNCTION mettre_a_jour_programme_fidelite(
  p_commerce_id          UUID,
  p_seuil_passages       INTEGER,
  p_description_recompense TEXT,
  p_actif                BOOLEAN,
  p_regle_tampons        TEXT DEFAULT NULL
)
RETURNS TABLE(
  success               BOOLEAN,
  message               TEXT,
  recompenses_debloquees INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id        UUID;
  v_ancien_seuil    INTEGER;
  v_recompenses_auto INTEGER := 0;
BEGIN
  SELECT owner_id INTO v_owner_id FROM commerces WHERE id = p_commerce_id;
  IF v_owner_id IS DISTINCT FROM auth.uid() THEN
    RETURN QUERY SELECT FALSE, 'Non autorisé'::TEXT, 0; RETURN;
  END IF;

  IF p_seuil_passages < 1 OR p_seuil_passages > 1000 THEN
    RETURN QUERY SELECT FALSE, 'Seuil invalide — entre 1 et 1000 passages requis'::TEXT, 0; RETURN;
  END IF;

  SELECT seuil_passages INTO v_ancien_seuil
    FROM programmes_fidelite WHERE commerce_id = p_commerce_id;

  INSERT INTO programmes_fidelite
    (commerce_id, seuil_passages, description_recompense, regle_tampons, actif)
    VALUES (p_commerce_id, p_seuil_passages, p_description_recompense, p_regle_tampons, p_actif)
    ON CONFLICT (commerce_id) DO UPDATE
      SET seuil_passages         = EXCLUDED.seuil_passages,
          description_recompense = EXCLUDED.description_recompense,
          regle_tampons          = EXCLUDED.regle_tampons,
          actif                  = EXCLUDED.actif,
          updated_at             = NOW();

  -- Option A : baisse de seuil → débloque immédiatement les clients éligibles
  IF v_ancien_seuil IS NOT NULL AND p_seuil_passages < v_ancien_seuil THEN
    WITH debloquables AS (
      SELECT id FROM cartes_fidelite
       WHERE commerce_id = p_commerce_id
         AND nb_passages_depuis_derniere_recompense >= p_seuil_passages
         AND recompense_en_attente = FALSE
    )
    UPDATE cartes_fidelite
       SET nb_passages_depuis_derniere_recompense = 0,
           nb_recompenses_debloquees              = nb_recompenses_debloquees + 1,
           recompense_en_attente                  = TRUE
     WHERE id IN (SELECT id FROM debloquables);

    GET DIAGNOSTICS v_recompenses_auto = ROW_COUNT;
  END IF;

  RETURN QUERY SELECT TRUE,
    'Programme mis à jour'::TEXT ||
    CASE WHEN v_recompenses_auto > 0
      THEN ' (' || v_recompenses_auto::TEXT || ' récompense(s) débloquée(s) immédiatement)'
      ELSE ''
    END,
    v_recompenses_auto;
END;
$$;

-- ── 17. Vue base client fidélité ─────────────────────────────────────────────
-- Téléphones masqués (RGPD) — lecture filtrée par RLS commerce
CREATE OR REPLACE VIEW vue_base_client_fidelite AS
SELECT
  cf.id            AS carte_id,
  cf.commerce_id,
  cf.client_type,
  COALESCE(u.nom, ul.prenom, 'Client anonyme') AS prenom_affiche,
  CASE
    WHEN cf.client_type = 'full' AND u.telephone IS NOT NULL THEN
      substring(u.telephone FROM 1 FOR 4) || ' ** ** ' ||
      substring(u.telephone FROM 9 FOR 2)
    WHEN cf.client_type = 'light' THEN
      substring(ul.telephone FROM 1 FOR 4) || ' ** ** ' ||
      substring(ul.telephone FROM 9 FOR 2)
    ELSE '—'
  END              AS telephone_masque,
  cf.nb_passages_total,
  cf.nb_passages_depuis_derniere_recompense,
  cf.nb_recompenses_debloquees,
  cf.recompense_en_attente,
  cf.derniere_activite,
  EXTRACT(DAY FROM NOW() - cf.derniere_activite)::INTEGER AS jours_depuis_activite,
  cf.seuil_passages_carte          AS seuil_passages,
  cf.description_recompense_carte  AS description_recompense
FROM cartes_fidelite cf
LEFT JOIN users u       ON u.id  = cf.user_id
LEFT JOIN users_light ul ON ul.id = cf.user_light_id;

COMMIT;
