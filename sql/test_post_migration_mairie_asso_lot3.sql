DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'participations_offres'
  ) THEN
    RAISE EXCEPTION 'Table participations_offres manquante';
  END IF;
  RAISE NOTICE 'Test 1 OK : table participations_offres présente';
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'participations_offres'
      AND column_name  = 'offre_id'
  ) THEN
    RAISE EXCEPTION 'Colonne participations_offres.offre_id manquante';
  END IF;
  RAISE NOTICE 'Test 2 OK : colonne offre_id présente';
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_offres_collectives_commerce') THEN
    RAISE EXCEPTION 'RPC get_offres_collectives_commerce manquante';
  END IF;
  RAISE NOTICE 'Test 3 OK : RPC get_offres_collectives_commerce présente';
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_participants_offre') THEN
    RAISE EXCEPTION 'RPC get_participants_offre manquante';
  END IF;
  RAISE NOTICE 'Test 4 OK : RPC get_participants_offre présente';
END $$;

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT proname, prosecdef
    FROM pg_proc
    WHERE proname IN ('get_offres_collectives_commerce', 'get_participants_offre')
  LOOP
    IF NOT rec.prosecdef THEN
      RAISE EXCEPTION 'RPC % n''est pas SECURITY DEFINER', rec.proname;
    END IF;
  END LOOP;
  RAISE NOTICE 'Test 5 OK : les 2 RPCs sont SECURITY DEFINER';
END $$;

DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE tablename = 'participations_offres';

  IF v_count < 4 THEN
    RAISE EXCEPTION 'Il manque des policies RLS sur participations_offres (trouvé : %)', v_count;
  END IF;
  RAISE NOTICE 'Test 6 OK : % policies RLS sur participations_offres', v_count;
END $$;

DO $$
BEGIN
  RAISE NOTICE '===================================';
  RAISE NOTICE 'TESTS LOT 3 POST-MIGRATION OK';
  RAISE NOTICE '===================================';
END $$;
