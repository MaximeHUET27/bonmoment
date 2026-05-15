-- ============================================================================
-- TESTS POST-MIGRATION : Module Mairie / Association — LOT 4A
-- À exécuter dans Supabase SQL Editor après add_mairie_asso_lot4a.sql
-- ============================================================================

-- Test 1 : RPC get_stats_cumulees_mairie_asso existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_stats_cumulees_mairie_asso') THEN
    RAISE EXCEPTION 'RPC get_stats_cumulees_mairie_asso manquante';
  END IF;
  RAISE NOTICE 'Test 1 OK : RPC get_stats_cumulees_mairie_asso présente';
END $$;

-- Test 2 : RPC est SECURITY DEFINER
DO $$
DECLARE
  v_secdef BOOLEAN;
BEGIN
  SELECT prosecdef INTO v_secdef FROM pg_proc
    WHERE proname = 'get_stats_cumulees_mairie_asso';
  IF NOT v_secdef THEN
    RAISE EXCEPTION 'RPC get_stats_cumulees_mairie_asso n''est pas SECURITY DEFINER';
  END IF;
  RAISE NOTICE 'Test 2 OK : RPC est SECURITY DEFINER';
END $$;

-- Test 3 : Colonne nb_avis_google existe sur commerces
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commerces' AND column_name = 'nb_avis_google'
  ) THEN
    RAISE EXCEPTION 'Colonne commerces.nb_avis_google manquante';
  END IF;
  RAISE NOTICE 'Test 3 OK : commerces.nb_avis_google présent';
END $$;

-- Test 4 : Colonne logo_url existe sur commerces (Lot 1)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commerces' AND column_name = 'logo_url'
  ) THEN
    RAISE EXCEPTION 'Colonne commerces.logo_url manquante (migration Lot 1 non exécutée ?)';
  END IF;
  RAISE NOTICE 'Test 4 OK : commerces.logo_url présent';
END $$;

-- Test 5 : Colonne affiche_logo_mairie_asso_id existe sur commerces (Lot 1)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commerces' AND column_name = 'affiche_logo_mairie_asso_id'
  ) THEN
    RAISE EXCEPTION 'Colonne commerces.affiche_logo_mairie_asso_id manquante (migration Lot 1 non exécutée ?)';
  END IF;
  RAISE NOTICE 'Test 5 OK : commerces.affiche_logo_mairie_asso_id présent';
END $$;

DO $$
BEGIN
  RAISE NOTICE '===================================';
  RAISE NOTICE 'TESTS LOT 4A POST-MIGRATION OK';
  RAISE NOTICE '===================================';
END $$;
