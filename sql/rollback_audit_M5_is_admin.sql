-- ============================================================================
-- Rollback : M5 — repose l'email en dur dans les 20 policies (etat
-- pre-audit), conserve is_admin() (inoffensive si non utilisee)
-- ============================================================================

BEGIN;

ALTER POLICY select_admin ON public.avis_google_clics USING ((auth.jwt() ->> 'email') = 'bonmomentapp@gmail.com');

ALTER POLICY admin_delete_charges ON public.charges USING ((auth.jwt() ->> 'email') = 'bonmomentapp@gmail.com');
ALTER POLICY admin_insert_charges ON public.charges WITH CHECK ((auth.jwt() ->> 'email') = 'bonmomentapp@gmail.com');
ALTER POLICY admin_select_charges ON public.charges USING ((auth.jwt() ->> 'email') = 'bonmomentapp@gmail.com');
ALTER POLICY admin_update_charges ON public.charges USING ((auth.jwt() ->> 'email') = 'bonmomentapp@gmail.com');
ALTER POLICY charges_admin_only   ON public.charges USING ((auth.jwt() ->> 'email') = 'bonmomentapp@gmail.com');

ALTER POLICY admin_read ON public.chatbot_feedbacks USING ((auth.jwt() ->> 'email') = 'bonmomentapp@gmail.com');

ALTER POLICY feedbacks_select_owner ON public.feedbacks_commerce
  USING (
    commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid())
    OR (auth.jwt() ->> 'email') = 'bonmomentapp@gmail.com'
  );
ALTER POLICY select_admin ON public.feedbacks_commerce USING ((auth.jwt() ->> 'email') = 'bonmomentapp@gmail.com');

ALTER POLICY admin_delete_params ON public.parametres_comptables USING ((auth.jwt() ->> 'email') = 'bonmomentapp@gmail.com');
ALTER POLICY admin_insert_params ON public.parametres_comptables WITH CHECK ((auth.jwt() ->> 'email') = 'bonmomentapp@gmail.com');
ALTER POLICY admin_select_params ON public.parametres_comptables USING ((auth.jwt() ->> 'email') = 'bonmomentapp@gmail.com');
ALTER POLICY admin_update_params ON public.parametres_comptables USING ((auth.jwt() ->> 'email') = 'bonmomentapp@gmail.com');
ALTER POLICY parametres_comptables_admin_only ON public.parametres_comptables USING ((auth.jwt() ->> 'email') = 'bonmomentapp@gmail.com');

ALTER POLICY admin_delete_recettes ON public.recettes USING ((auth.jwt() ->> 'email') = 'bonmomentapp@gmail.com');
ALTER POLICY admin_insert_recettes ON public.recettes WITH CHECK ((auth.jwt() ->> 'email') = 'bonmomentapp@gmail.com');
ALTER POLICY admin_select_recettes ON public.recettes USING ((auth.jwt() ->> 'email') = 'bonmomentapp@gmail.com');
ALTER POLICY admin_update_recettes ON public.recettes USING ((auth.jwt() ->> 'email') = 'bonmomentapp@gmail.com');

ALTER POLICY "Admin only uuda00_0" ON storage.objects WITH CHECK ((auth.jwt() ->> 'email') = 'bonmomentapp@gmail.com');
ALTER POLICY "Admin only uuda00_1" ON storage.objects USING ((auth.jwt() ->> 'email') = 'bonmomentapp@gmail.com');
ALTER POLICY "Admin only uuda00_2" ON storage.objects USING ((auth.jwt() ->> 'email') = 'bonmomentapp@gmail.com');
ALTER POLICY "Admin only uuda00_3" ON storage.objects USING ((auth.jwt() ->> 'email') = 'bonmomentapp@gmail.com');

COMMIT;
