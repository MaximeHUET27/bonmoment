-- ============================================================================
-- MIGRATION : Module Mairie / Association — LOT 3
-- Date : 2026-05-13
-- ============================================================================
-- 100% additive. Aucune table, colonne ou policy existante n'est modifiée.
-- Prérequis : Lot 1 (avec_bon, mairie_asso_membres) et Lot 2 (RPCs).
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.1  Table participations_offres
--      Enregistre les inscriptions aux événements sans bon (avec_bon = FALSE).
--      Les offres classiques continuent d'utiliser la table reservations.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS participations_offres (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  offre_id   UUID        NOT NULL REFERENCES offres(id)      ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT participation_unique UNIQUE (offre_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_participations_offre ON participations_offres(offre_id);
CREATE INDEX IF NOT EXISTS idx_participations_user  ON participations_offres(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.2  RLS participations_offres
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE participations_offres ENABLE ROW LEVEL SECURITY;

-- Tout utilisateur connecté peut s'inscrire (son propre user_id uniquement)
CREATE POLICY "user_peut_participer" ON participations_offres
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- L'utilisateur voit ses propres inscriptions
CREATE POLICY "user_voit_ses_participations" ON participations_offres
  FOR SELECT
  USING (user_id = auth.uid());

-- Le propriétaire du commerce voit tous les participants de ses offres
CREATE POLICY "owner_voit_participants" ON participations_offres
  FOR SELECT
  USING (
    offre_id IN (
      SELECT o.id FROM offres o
      JOIN commerces c ON c.id = o.commerce_id
      WHERE c.owner_id = auth.uid()
    )
  );

-- Un membre accepté de la mairie/asso voit les participants de ses offres collectives
CREATE POLICY "membre_voit_participants_collectifs" ON participations_offres
  FOR SELECT
  USING (
    offre_id IN (
      SELECT o.id FROM offres o
      WHERE o.commerce_id IN (
        SELECT m.mairie_asso_id
        FROM mairie_asso_membres m
        JOIN commerces c ON c.id = m.commerce_id
        WHERE c.owner_id = auth.uid()
          AND m.statut = 'accepted'
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.3  RPC get_offres_collectives_commerce
--      Retourne les offres actives publiées par les mairie_asso dont
--      le commerce p_commerce_id est membre accepté.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_offres_collectives_commerce(p_commerce_id UUID)
RETURNS TABLE (
  offre_id          UUID,
  offre_titre       TEXT,
  offre_type_remise TEXT,
  offre_valeur      NUMERIC,
  offre_date_debut  TIMESTAMPTZ,
  offre_date_fin    TIMESTAMPTZ,
  offre_avec_bon    BOOLEAN,
  offre_nb_restants INTEGER,
  offre_nb_total    INTEGER,
  asso_id           UUID,
  asso_nom          TEXT,
  asso_photo_url    TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT owner_id INTO v_owner_id FROM commerces WHERE id = p_commerce_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Commerce introuvable';
  END IF;

  IF v_owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  RETURN QUERY
  SELECT
    o.id               AS offre_id,
    o.titre            AS offre_titre,
    o.type_remise      AS offre_type_remise,
    o.valeur           AS offre_valeur,
    o.date_debut       AS offre_date_debut,
    o.date_fin         AS offre_date_fin,
    o.avec_bon         AS offre_avec_bon,
    o.nb_bons_restants AS offre_nb_restants,
    o.nb_bons_total    AS offre_nb_total,
    asso.id            AS asso_id,
    asso.nom           AS asso_nom,
    asso.photo_url     AS asso_photo_url
  FROM mairie_asso_membres m
  JOIN commerces asso ON asso.id = m.mairie_asso_id
  JOIN offres o ON o.commerce_id = asso.id
  WHERE m.commerce_id = p_commerce_id
    AND m.statut = 'accepted'
    AND o.statut = 'active'
    AND o.date_fin > NOW()
  ORDER BY o.date_debut ASC;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.4  RPC get_participants_offre
--      Retourne les participants d'une offre sans bon.
--      Accessible uniquement au propriétaire du commerce ou à un membre accepté.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_participants_offre(p_offre_id UUID)
RETURNS TABLE (
  user_id    UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commerce_id UUID;
BEGIN
  SELECT commerce_id INTO v_commerce_id FROM offres WHERE id = p_offre_id;

  IF v_commerce_id IS NULL THEN
    RAISE EXCEPTION 'Offre introuvable';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM commerces WHERE id = v_commerce_id AND owner_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM mairie_asso_membres m
    JOIN commerces c ON c.id = m.commerce_id
    WHERE m.mairie_asso_id = v_commerce_id
      AND m.statut = 'accepted'
      AND c.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  RETURN QUERY
  SELECT p.user_id, p.created_at
  FROM participations_offres p
  WHERE p.offre_id = p_offre_id
  ORDER BY p.created_at ASC;
END;
$$;

COMMIT;

-- ============================================================================
-- FIN DE LA MIGRATION LOT 3
-- Pour vérifier : sql/test_post_migration_mairie_asso_lot3.sql
-- Pour rollback  : sql/rollback_mairie_asso_lot3.sql
-- ============================================================================
