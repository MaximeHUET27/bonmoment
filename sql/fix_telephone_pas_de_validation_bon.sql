-- ═══════════════════════════════════════════════════════════════════════════
-- PATCH : Le mode téléphone n'a plus le droit de valider un bon
-- Le mode téléphone ajoute uniquement un tampon fidélité.
-- Seuls les modes QR et code_6 conservent la validation automatique du bon.
-- Idempotent : CREATE OR REPLACE FUNCTION
-- ═══════════════════════════════════════════════════════════════════════════

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

  -- ── Vérification bon actif (clients 'full', modes QR et code_6 uniquement) ─
  -- Le mode téléphone n'a jamais le droit de valider un bon, même si le client
  -- en a un en statut reservee. L'ajout de tampon est indépendant de la caisse.
  IF v_client_type = 'full' AND p_mode_identification IN ('qr', 'code_6') THEN
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
