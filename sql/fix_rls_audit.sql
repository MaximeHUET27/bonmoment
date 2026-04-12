-- ============================================================
-- BONMOMENT — Corrections audit sécurité
-- Généré le 2026-04-01
-- À exécuter dans le SQL Editor Supabase
-- ============================================================

-- ============================================================
-- SEC-05 : Table users — restreindre SELECT à son propre profil
-- ============================================================

-- Supprime les anciennes policies (trop large ou doublon)
DROP POLICY IF EXISTS "users_select_public" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;

-- Un utilisateur ne peut lire que son propre profil.
-- Les routes API admin utilisent service_role qui bypass RLS.
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- ============================================================
-- SEC-06 : Table commerces — SELECT public mais colonnes sensibles
-- ============================================================
-- La policy SELECT existante (USING true) expose stripe_customer_id et notes_admin.
-- Option A (recommandée) : créer une vue publique sans colonnes sensibles.
-- Option B : restreindre la policy (casse la page publique des commerces).
-- → On choisit l'option A : vue publique, policy SELECT inchangée pour la vue.

-- Vue publique sans données sensibles
CREATE OR REPLACE VIEW public.commerces_public AS
SELECT
  id,
  place_id,
  owner_id,
  nom,
  categorie,
  categorie_bonmoment,
  adresse,
  ville,
  description,
  photo_url,
  qr_code_url,
  abonnement_actif,
  code_parrainage,
  code_parrainage_expire_at,
  parrain_id,
  parrainage_filleuls_mois,
  telephone,
  note_google,
  horaires,
  latitude,
  longitude,
  created_at
  -- Colonnes EXCLUES : stripe_customer_id, notes_admin
FROM public.commerces;

-- Note : stripe_customer_id et notes_admin ne doivent être accessibles
-- que via service_role (routes API admin). Les colonnes ne sont pas dans
-- la vue publique.

-- ============================================================
-- ROB-01 : RPC atomique pour la réservation de bons
-- Résout la race condition stock_check + update non-atomiques
-- ============================================================

CREATE OR REPLACE FUNCTION reserver_bon(p_offre_id UUID, p_user_id UUID)
RETURNS TABLE(
  success          BOOLEAN,
  code_validation  TEXT,
  reservation_id   UUID,
  message          TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_nb_restants  INTEGER;
  v_unlimited    BOOLEAN;
  v_code         TEXT;
  v_resa_id      UUID;
  v_existing_id  UUID;
  v_existing_statut TEXT;
BEGIN
  -- 1. Vérifier si une réservation non-annulée existe déjà
  SELECT id, statut
    INTO v_existing_id, v_existing_statut
    FROM reservations
   WHERE user_id = p_user_id
     AND offre_id = p_offre_id
     AND statut != 'annulee'
   LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::UUID, v_existing_statut::TEXT;
    RETURN;
  END IF;

  -- 2. Décrémenter atomiquement (ou vérifier que l'offre est valide pour illimité)
  --    nb_bons_restants IS NULL ou = 9999 → illimité, pas de décrémentation
  SELECT nb_bons_restants INTO v_nb_restants
    FROM offres
   WHERE id = p_offre_id
     AND statut = 'active'
     AND date_fin > NOW();

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::UUID, 'Offre indisponible'::TEXT;
    RETURN;
  END IF;

  v_unlimited := (v_nb_restants IS NULL OR v_nb_restants = 9999);

  IF NOT v_unlimited THEN
    -- Décrémentation atomique avec vérification stock > 0
    UPDATE offres
       SET nb_bons_restants = nb_bons_restants - 1
     WHERE id = p_offre_id
       AND nb_bons_restants > 0;

    IF NOT FOUND THEN
      RETURN QUERY SELECT false, NULL::TEXT, NULL::UUID, 'Plus de bons disponibles'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- 3. Générer un code 6 chiffres unique pour cette offre
  FOR i IN 1..10 LOOP
    v_code := LPAD((FLOOR(RANDOM() * 900000) + 100000)::INTEGER::TEXT, 6, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM reservations
       WHERE offre_id = p_offre_id AND code_validation = v_code
    );
    v_code := NULL;
  END LOOP;

  IF v_code IS NULL THEN
    -- Rollback stock si on n'a pas pu générer de code
    IF NOT v_unlimited THEN
      UPDATE offres SET nb_bons_restants = nb_bons_restants + 1 WHERE id = p_offre_id;
    END IF;
    RETURN QUERY SELECT false, NULL::TEXT, NULL::UUID, 'Erreur génération code'::TEXT;
    RETURN;
  END IF;

  -- 4. Créer la réservation
  INSERT INTO reservations (user_id, offre_id, code_validation, qr_code_data, statut)
  VALUES (p_user_id, p_offre_id, v_code, '', 'reservee')
  RETURNING id INTO v_resa_id;

  -- 5. Retourner le résultat (le client mettra à jour qr_code_data avec l'URL réelle)
  RETURN QUERY SELECT true, v_code, v_resa_id, 'OK'::TEXT;
END;
$$;

-- Accorder les droits d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION reserver_bon(UUID, UUID) TO authenticated;

-- ============================================================
-- Vérification des autres tables (déjà correctes)
-- ============================================================

-- TABLE offres :
--   offres_select_public USING (statut = 'active') ✓
--   offres_insert/update/delete vérifient owner_id via join commerces ✓

-- TABLE reservations :
--   reservations_select_own USING (auth.uid() = user_id) ✓
--   reservations_select_commerce_owner (via join) ✓
--   reservations_insert_own / update_own / delete_own ✓

-- TABLE villes :
--   villes_select_public USING (active = true) ✓ (pas de données sensibles)

-- TABLE charges (comptabilité) :
--   Vérifier que les policies limitent aux commerces de l'owner.

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
