-- ============================================================
-- BONMOMENT — Fix RLS final pré-production
-- À exécuter dans Supabase SQL Editor
-- Utiliser APRÈS avoir vérifié : SELECT tablename FROM pg_tables
-- WHERE schemaname = 'public' AND rowsecurity = false;
-- ============================================================

-- Protection : activer RLS uniquement si pas déjà actif (idempotent)

-- TABLE : villes (données publiques en lecture, admin en écriture)
ALTER TABLE public.villes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='villes' AND policyname='villes_select_public') THEN
    CREATE POLICY "villes_select_public" ON public.villes FOR SELECT USING (true);
  END IF;
END $$;

-- TABLE : codes_parrainage
ALTER TABLE public.codes_parrainage ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='codes_parrainage' AND policyname='codes_parrainage_select_owner') THEN
    CREATE POLICY "codes_parrainage_select_owner" ON public.codes_parrainage
      FOR SELECT USING (auth.uid() = created_by OR auth.jwt()->>'email' = 'bonmomentapp@gmail.com');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='codes_parrainage' AND policyname='codes_parrainage_insert_authenticated') THEN
    CREATE POLICY "codes_parrainage_insert_authenticated" ON public.codes_parrainage
      FOR INSERT WITH CHECK (auth.uid() = created_by);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='codes_parrainage' AND policyname='codes_parrainage_update_authenticated') THEN
    CREATE POLICY "codes_parrainage_update_authenticated" ON public.codes_parrainage
      FOR UPDATE USING (auth.jwt()->>'email' = 'bonmomentapp@gmail.com' OR auth.uid() IS NOT NULL);
  END IF;
END $$;

-- TABLE : charges (comptabilité — admin only)
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='charges' AND policyname='charges_admin_only') THEN
    CREATE POLICY "charges_admin_only" ON public.charges
      FOR ALL USING (auth.jwt()->>'email' = 'bonmomentapp@gmail.com');
  END IF;
END $$;

-- TABLE : parametres_comptables (admin only)
ALTER TABLE public.parametres_comptables ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='parametres_comptables' AND policyname='parametres_comptables_admin_only') THEN
    CREATE POLICY "parametres_comptables_admin_only" ON public.parametres_comptables
      FOR ALL USING (auth.jwt()->>'email' = 'bonmomentapp@gmail.com');
  END IF;
END $$;

-- TABLE : rapport_mensuel_exclus (si elle existe)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='rapport_mensuel_exclus') THEN
    ALTER TABLE public.rapport_mensuel_exclus ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rapport_mensuel_exclus' AND policyname='rapport_mensuel_exclus_owner') THEN
      CREATE POLICY "rapport_mensuel_exclus_owner" ON public.rapport_mensuel_exclus
        FOR ALL USING (auth.uid() = user_id OR auth.jwt()->>'email' = 'bonmomentapp@gmail.com');
    END IF;
  END IF;
END $$;

-- Vérification finale : lister les tables toujours sans RLS
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
