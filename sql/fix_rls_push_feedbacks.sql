-- ============================================================
-- BONMOMENT — RLS pour push_subscriptions et feedbacks_commerce
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- TABLE : push_subscriptions
-- Chaque user ne voit et ne modifie que ses propres abonnements push.
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='push_subscriptions' AND policyname='user_own_subscriptions') THEN
    CREATE POLICY "user_own_subscriptions" ON public.push_subscriptions
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- TABLE : feedbacks_commerce
-- INSERT : tout utilisateur connecté peut laisser un feedback.
-- SELECT : le propriétaire du commerce concerné + l'admin.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='feedbacks_commerce') THEN
    ALTER TABLE public.feedbacks_commerce ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='feedbacks_commerce' AND policyname='feedbacks_insert_authenticated') THEN
      CREATE POLICY "feedbacks_insert_authenticated" ON public.feedbacks_commerce
        FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='feedbacks_commerce' AND policyname='feedbacks_select_owner') THEN
      CREATE POLICY "feedbacks_select_owner" ON public.feedbacks_commerce
        FOR SELECT USING (
          commerce_id IN (SELECT id FROM public.commerces WHERE owner_id = auth.uid())
          OR auth.jwt()->>'email' = 'bonmomentapp@gmail.com'
        );
    END IF;
  END IF;
END $$;

-- Vérification
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('push_subscriptions', 'feedbacks_commerce')
ORDER BY tablename, cmd;
