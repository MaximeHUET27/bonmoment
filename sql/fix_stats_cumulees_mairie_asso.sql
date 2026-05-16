-- ============================================================================
-- FIX : get_stats_cumulees_mairie_asso — compter les adhérents, pas l'asso
-- ============================================================================
-- Bug : les requêtes bons_reserves et nb_offres_publiees filtraient sur
-- commerce_id = p_asso_id (les offres de l'asso elle-même) au lieu de
-- filtrer sur les commerce_id des membres acceptés de l'asso.
-- ============================================================================

BEGIN;

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

  -- Calcul des bons réservés et validés sur les offres des MEMBRES (corrigé)
  SELECT
    COUNT(*) FILTER (WHERE r.statut IN ('reservee', 'utilisee', 'expiree')),
    COUNT(*) FILTER (WHERE r.statut = 'utilisee')
  INTO v_bons_reserves, v_bons_valides
  FROM reservations r
  JOIN offres o ON o.id = r.offre_id
  WHERE o.commerce_id IN (
    SELECT m.commerce_id
    FROM mairie_asso_membres m
    WHERE m.mairie_asso_id = p_asso_id
      AND m.statut = 'accepted'
  )
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
    -- Offres publiées par les MEMBRES sur la période (corrigé)
    (SELECT COUNT(*) FROM offres
       WHERE commerce_id IN (
         SELECT m.commerce_id
         FROM mairie_asso_membres m
         WHERE m.mairie_asso_id = p_asso_id
           AND m.statut = 'accepted'
       )
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
  'Stats cumulées des MEMBRES (pas de l''asso elle-même). Filtre temporel 7j/30j/total.';

COMMIT;
