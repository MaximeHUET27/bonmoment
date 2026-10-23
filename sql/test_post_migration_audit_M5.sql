-- ============================================================================
-- Test post-migration — M5 : is_admin() et policies
-- ============================================================================

-- 1. Fonction en place
SELECT is_admin();
-- Attendu : false (aucun jwt dans ce contexte de test SQL direct)

-- 2. Aucune policy ne reference plus l'email en dur
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE qual LIKE '%bonmomentapp@gmail.com%' OR with_check LIKE '%bonmomentapp@gmail.com%';
-- Attendu : 0 ligne

-- 3. Les 20 policies reference bien is_admin()
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE qual LIKE '%is_admin%' OR with_check LIKE '%is_admin%'
ORDER BY tablename, policyname;
-- Attendu : 20 lignes (avis_google_clics:1, charges:5, chatbot_feedbacks:1,
-- feedbacks_commerce:2, parametres_comptables:5, recettes:4, storage.objects:4
-- -- NB : charges_admin_only et parametres_comptables_admin_only comptent
-- dans leurs tables respectives)

-- 4. Non-regression manuelle : connecte en tant qu'admin
-- (bonmomentapp@gmail.com), /admin/comptabilite doit toujours afficher
-- charges/recettes/parametres ; un autre compte ne doit rien voir.
