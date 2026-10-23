-- ============================================================================
-- Test post-migration — M7 : rate limiting partage
-- ============================================================================

-- 1. anon/authenticated ne peuvent pas appeler la fonction directement
SET ROLE anon;
SELECT check_rate_limit('test:1000:1.2.3.4', 3, 1000);
-- Attendu : ERREUR permission denied for function check_rate_limit
RESET ROLE;

-- 2. Comportement fenetre fixe : 3 appels autorises sur une limite de 3,
--    le 4e refuse, dans la meme fenetre
SELECT check_rate_limit('test_m7_demo', 3, 60000); -- true (count=1)
SELECT check_rate_limit('test_m7_demo', 3, 60000); -- true (count=2)
SELECT check_rate_limit('test_m7_demo', 3, 60000); -- true (count=3)
SELECT check_rate_limit('test_m7_demo', 3, 60000); -- false (count=4 > 3)

-- 3. Nettoyage de la ligne de demo (ne pas laisser de donnees de test)
DELETE FROM rate_limits WHERE key = 'test_m7_demo';

-- 4. Non-regression manuelle : repeter rapidement un POST sur une route
--    limitee (ex. /api/contact, 5 requetes / 15 min) doit renvoyer 429
--    a la 6e tentative, et ce depuis n'importe quelle instance (teste en
--    reel sur plusieurs requetes consecutives, pas verifiable en SQL pur).
