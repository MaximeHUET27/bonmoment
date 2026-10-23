-- ============================================================================
-- Audit 2026-10 — M5 : centralisation de la verification admin
-- ============================================================================
-- bonmomentapp@gmail.com etait compare en dur dans 20 policies RLS sur 7
-- objets (public.charges, public.parametres_comptables, public.recettes,
-- public.chatbot_feedbacks, public.feedbacks_commerce,
-- public.avis_google_clics, storage.objects). Creation d'une fonction
-- unique is_admin(), meme email qu'avant (aucun changement de
-- comportement) ; toutes les policies pointent desormais vers elle.
-- Cote applicatif : lib/isAdmin.js centralise la meme comparaison pour les
-- 21 fichiers qui la faisaient en dur (hors app/api/contact/route.js, ou
-- l'email sert de destinataire de formulaire, pas de controle d'acces).
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT (auth.jwt() ->> 'email') = 'bonmomentapp@gmail.com';
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon, service_role;

-- avis_google_clics
ALTER POLICY select_admin ON public.avis_google_clics USING (is_admin());

-- charges
ALTER POLICY admin_delete_charges ON public.charges USING (is_admin());
ALTER POLICY admin_insert_charges ON public.charges WITH CHECK (is_admin());
ALTER POLICY admin_select_charges ON public.charges USING (is_admin());
ALTER POLICY admin_update_charges ON public.charges USING (is_admin());
ALTER POLICY charges_admin_only   ON public.charges USING (is_admin());

-- chatbot_feedbacks
ALTER POLICY admin_read ON public.chatbot_feedbacks USING (is_admin());

-- feedbacks_commerce
ALTER POLICY feedbacks_select_owner ON public.feedbacks_commerce
  USING (
    commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid())
    OR is_admin()
  );
ALTER POLICY select_admin ON public.feedbacks_commerce USING (is_admin());

-- parametres_comptables
ALTER POLICY admin_delete_params ON public.parametres_comptables USING (is_admin());
ALTER POLICY admin_insert_params ON public.parametres_comptables WITH CHECK (is_admin());
ALTER POLICY admin_select_params ON public.parametres_comptables USING (is_admin());
ALTER POLICY admin_update_params ON public.parametres_comptables USING (is_admin());
ALTER POLICY parametres_comptables_admin_only ON public.parametres_comptables USING (is_admin());

-- recettes
ALTER POLICY admin_delete_recettes ON public.recettes USING (is_admin());
ALTER POLICY admin_insert_recettes ON public.recettes WITH CHECK (is_admin());
ALTER POLICY admin_select_recettes ON public.recettes USING (is_admin());
ALTER POLICY admin_update_recettes ON public.recettes USING (is_admin());

-- storage.objects
ALTER POLICY "Admin only uuda00_0" ON storage.objects WITH CHECK (is_admin());
ALTER POLICY "Admin only uuda00_1" ON storage.objects USING (is_admin());
ALTER POLICY "Admin only uuda00_2" ON storage.objects USING (is_admin());
ALTER POLICY "Admin only uuda00_3" ON storage.objects USING (is_admin());

COMMIT;
