-- ============================================================================
-- MIGRATION : Module Mairie / Association — LOT 2 (RPC invitations)
-- ============================================================================
-- 100% additive. Aucune table, colonne ou policy existante n'est modifiée.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION get_commercants_invitables(
  p_asso_id UUID,
  p_search_query TEXT DEFAULT ''
)
RETURNS TABLE (
  id UUID,
  nom TEXT,
  categorie_bonmoment TEXT,
  photo_url TEXT,
  adresse TEXT,
  ville TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asso_owner_id UUID;
  v_asso_ville TEXT;
BEGIN
  SELECT owner_id, ville INTO v_asso_owner_id, v_asso_ville
  FROM commerces
  WHERE commerces.id = p_asso_id
    AND commerces.categorie_bonmoment = 'mairie_asso';

  IF v_asso_owner_id IS NULL THEN
    RAISE EXCEPTION 'Mairie/asso introuvable ou catégorie invalide';
  END IF;

  IF v_asso_owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé : vous n''êtes pas owner de cette mairie/asso';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.nom,
    c.categorie_bonmoment,
    c.photo_url,
    c.adresse,
    c.ville
  FROM commerces c
  WHERE c.ville = v_asso_ville
    AND c.categorie_bonmoment <> 'mairie_asso'
    AND c.abonnement_actif = TRUE
    AND c.id <> p_asso_id
    AND NOT EXISTS (
      SELECT 1 FROM mairie_asso_membres m
      WHERE m.mairie_asso_id = p_asso_id
        AND m.commerce_id = c.id
        AND m.statut IN ('pending', 'accepted')
    )
    AND (
      p_search_query IS NULL
      OR p_search_query = ''
      OR c.nom ILIKE '%' || p_search_query || '%'
    )
  ORDER BY c.nom ASC
  LIMIT 50;
END;
$$;

CREATE OR REPLACE FUNCTION get_membres_mairie_asso(p_asso_id UUID)
RETURNS TABLE (
  id UUID,
  commerce_id UUID,
  commerce_nom TEXT,
  commerce_categorie TEXT,
  commerce_photo_url TEXT,
  statut TEXT,
  created_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asso_owner_id UUID;
BEGIN
  SELECT owner_id INTO v_asso_owner_id
  FROM commerces
  WHERE commerces.id = p_asso_id
    AND commerces.categorie_bonmoment = 'mairie_asso';

  IF v_asso_owner_id IS NULL THEN
    RAISE EXCEPTION 'Mairie/asso introuvable';
  END IF;

  IF v_asso_owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.commerce_id,
    c.nom,
    c.categorie_bonmoment,
    c.photo_url,
    m.statut,
    m.created_at,
    m.accepted_at
  FROM mairie_asso_membres m
  JOIN commerces c ON c.id = m.commerce_id
  WHERE m.mairie_asso_id = p_asso_id
    AND m.statut IN ('pending', 'accepted')
  ORDER BY
    CASE m.statut WHEN 'pending' THEN 1 WHEN 'accepted' THEN 2 END,
    m.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_invitations_et_adhesions_commerce(p_commerce_id UUID)
RETURNS TABLE (
  id UUID,
  mairie_asso_id UUID,
  mairie_asso_nom TEXT,
  mairie_asso_photo_url TEXT,
  statut TEXT,
  created_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commerce_owner_id UUID;
BEGIN
  SELECT owner_id INTO v_commerce_owner_id
  FROM commerces
  WHERE commerces.id = p_commerce_id;

  IF v_commerce_owner_id IS NULL THEN
    RAISE EXCEPTION 'Commerce introuvable';
  END IF;

  IF v_commerce_owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.mairie_asso_id,
    c.nom,
    c.photo_url,
    m.statut,
    m.created_at,
    m.accepted_at
  FROM mairie_asso_membres m
  JOIN commerces c ON c.id = m.mairie_asso_id
  WHERE m.commerce_id = p_commerce_id
    AND m.statut IN ('pending', 'accepted')
  ORDER BY
    CASE m.statut WHEN 'pending' THEN 1 WHEN 'accepted' THEN 2 END,
    m.created_at DESC;
END;
$$;

COMMIT;
