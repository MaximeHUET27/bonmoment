DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_commercants_invitables') THEN
    RAISE EXCEPTION 'RPC get_commercants_invitables manquante';
  END IF;
  RAISE NOTICE 'Test 1 OK : RPC get_commercants_invitables présente';
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_membres_mairie_asso') THEN
    RAISE EXCEPTION 'RPC get_membres_mairie_asso manquante';
  END IF;
  RAISE NOTICE 'Test 2 OK : RPC get_membres_mairie_asso présente';
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_invitations_et_adhesions_commerce') THEN
    RAISE EXCEPTION 'RPC get_invitations_et_adhesions_commerce manquante';
  END IF;
  RAISE NOTICE 'Test 3 OK : RPC get_invitations_et_adhesions_commerce présente';
END $$;

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT proname, prosecdef
    FROM pg_proc
    WHERE proname IN (
      'get_commercants_invitables',
      'get_membres_mairie_asso',
      'get_invitations_et_adhesions_commerce'
    )
  LOOP
    IF NOT rec.prosecdef THEN
      RAISE EXCEPTION 'RPC % n''est pas SECURITY DEFINER', rec.proname;
    END IF;
  END LOOP;
  RAISE NOTICE 'Test 4 OK : les 3 RPC sont SECURITY DEFINER';
END $$;

DO $$
BEGIN
  RAISE NOTICE '===================================';
  RAISE NOTICE 'TESTS LOT 2 POST-MIGRATION OK';
  RAISE NOTICE '===================================';
END $$;
