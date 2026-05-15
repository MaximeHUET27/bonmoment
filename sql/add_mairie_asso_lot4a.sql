-- ============================================================================
-- MIGRATION : Module Mairie / Association — LOT 4A
-- ============================================================================
-- 100% additive. Aucune modification destructive.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- RPC get_stats_cumulees_mairie_asso(asso_id, periode)
-- ----------------------------------------------------------------------------
-- Retourne les KPIs agrégés des membres acceptés d'une mairie/asso.
-- Aucune statistique individuelle n'est exposée (séparation stricte).
-- periode : '7j' / '30j' / 'total'
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_stats_cumulees_mairie_asso(
  p_asso_id UUID,
  p_periode TEXT DEFAULT 'total'
)
RETURNS TABLE (
  bons_reserves BIGINT,
  bons_valides BIGINT,
  taux_validation NUMERIC,
  nb_membres_actifs BIGINT,
  nb_offres_publiees BIGINT,
  nb_avis_google_cumules BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asso_owner_id UUID;
  v_date_min TIMESTAMPTZ;
  v_bons_reserves BIGINT;
  v_bons_valides BIGINT;
  v_taux NUMERIC;
BEGIN
  -- Vérifier l'accès
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

  -- Calculer la date minimum selon la période
  v_date_min := CASE p_periode
    WHEN '7j'  THEN NOW() - INTERVAL '7 days'
    WHEN '30j' THEN NOW() - INTERVAL '30 days'
    ELSE NULL  -- 'total' = pas de filtre
  END;

  -- Calcul des bons réservés et validés sur les offres de l'asso
  SELECT
    COUNT(*) FILTER (WHERE r.statut IN ('reservee', 'utilisee', 'expiree')),
    COUNT(*) FILTER (WHERE r.statut = 'utilisee')
  INTO v_bons_reserves, v_bons_valides
  FROM reservations r
  JOIN offres o ON o.id = r.offre_id
  WHERE o.commerce_id = p_asso_id
    AND (v_date_min IS NULL OR r.created_at >= v_date_min);

  -- Calcul du taux (éviter division par zéro)
  IF v_bons_reserves > 0 THEN
    v_taux := ROUND((v_bons_valides::NUMERIC / v_bons_reserves::NUMERIC) * 100, 1);
  ELSE
    v_taux := 0;
  END IF;

  RETURN QUERY
  SELECT
    v_bons_reserves,
    v_bons_valides,
    v_taux,
    -- Membres actifs (statut accepted)
    (SELECT COUNT(*) FROM mairie_asso_membres
       WHERE mairie_asso_id = p_asso_id AND statut = 'accepted'),
    -- Offres publiées sur la période
    (SELECT COUNT(*) FROM offres
       WHERE commerce_id = p_asso_id
       AND (v_date_min IS NULL OR created_at >= v_date_min)),
    -- Avis Google cumulés des membres acceptés
    COALESCE((
      SELECT SUM(COALESCE(c.nb_avis_google, 0))::BIGINT
      FROM mairie_asso_membres m
      JOIN commerces c ON c.id = m.commerce_id
      WHERE m.mairie_asso_id = p_asso_id
        AND m.statut = 'accepted'
    ), 0);
END;
$$;

COMMENT ON FUNCTION get_stats_cumulees_mairie_asso IS
  'Stats cumulées sans détail individuel. Filtre temporel 7j/30j/total.';

-- ----------------------------------------------------------------------------
-- Ajout du champ nb_avis_google si absent
-- ----------------------------------------------------------------------------
-- Pour cumuler les avis Google des membres. Sans effet si déjà présent.
-- ----------------------------------------------------------------------------

ALTER TABLE commerces
  ADD COLUMN IF NOT EXISTS nb_avis_google INTEGER DEFAULT 0;

COMMENT ON COLUMN commerces.nb_avis_google IS
  'Nombre total d''avis Google du commerce (récupéré via Google Places API).';

COMMIT;
