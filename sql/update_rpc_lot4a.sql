-- ============================================================================
-- MISE À JOUR RPC : Module Mairie / Association — LOT 4A
-- Ajout du champ mairie_asso_logo_url dans get_invitations_et_adhesions_commerce
-- ============================================================================
-- À exécuter APRÈS add_mairie_asso_lot4a.sql dans Supabase SQL Editor.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION get_invitations_et_adhesions_commerce(p_commerce_id UUID)
RETURNS TABLE (
  id UUID,
  mairie_asso_id UUID,
  mairie_asso_nom TEXT,
  mairie_asso_photo_url TEXT,
  mairie_asso_logo_url TEXT,
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
  FROM commerces WHERE commerces.id = p_commerce_id;

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
    c.logo_url,
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

COMMENT ON FUNCTION get_invitations_et_adhesions_commerce IS
  'Retourne les invitations et adhésions du commerce. Inclut logo_url (ajouté Lot 4A).';

COMMIT;
