-- ============================================================================
-- Test post-migration — m2-mineur : search_path sur les fonctions
-- SECURITY DEFINER restantes
-- ============================================================================

SELECT p.proname, p.proconfig
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.prosecdef = true
AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig,'{}')) c WHERE c LIKE 'search_path=%');
-- Attendu : 0 ligne

-- Non-regression manuelle : reserver un bon, l'annuler, et verifier la
-- fidelite (activer/desactiver/modifier telephone) fonctionnent toujours.
