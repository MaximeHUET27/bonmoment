-- ============================================================
-- BONMOMENT — Purge données de test
-- À exécuter UNIQUEMENT avant la mise en production
-- VÉRIFIER les données avant de décommenter !
-- ============================================================

-- ÉTAPE 1 — Identifier les données de test (vérification)
SELECT id, nom, place_id FROM commerces
WHERE place_id LIKE 'test_%' OR place_id LIKE 'place_%' OR place_id LIKE 'ChIJ_test%';

-- ÉTAPE 2 — Compter les réservations liées
-- SELECT COUNT(*) FROM reservations
-- WHERE offre_id IN (
--   SELECT id FROM offres
--   WHERE commerce_id IN (
--     SELECT id FROM commerces WHERE place_id LIKE 'test_%' OR place_id LIKE 'place_%'
--   )
-- );

-- ÉTAPE 3 — Purge (décommenter APRÈS vérification)

-- DELETE FROM reservations
-- WHERE offre_id IN (
--   SELECT id FROM offres
--   WHERE commerce_id IN (
--     SELECT id FROM commerces WHERE place_id LIKE 'test_%' OR place_id LIKE 'place_%'
--   )
-- );

-- DELETE FROM offres
-- WHERE commerce_id IN (
--   SELECT id FROM commerces WHERE place_id LIKE 'test_%' OR place_id LIKE 'place_%'
-- );

-- DELETE FROM commerces
-- WHERE place_id LIKE 'test_%' OR place_id LIKE 'place_%';

-- ÉTAPE 4 — Purge feedbacks/avis liés aux tests
-- DELETE FROM avis_google_clics
-- WHERE commerce_id IN (
--   SELECT id FROM commerces WHERE place_id LIKE 'test_%' OR place_id LIKE 'place_%'
-- );

-- DELETE FROM feedbacks_commerce
-- WHERE commerce_id IN (
--   SELECT id FROM commerces WHERE place_id LIKE 'test_%' OR place_id LIKE 'place_%'
-- );

-- ÉTAPE 5 — Vérification post-purge
-- SELECT COUNT(*) AS commerces_restants FROM commerces;
-- SELECT COUNT(*) AS offres_restantes FROM offres;
-- SELECT COUNT(*) AS reservations_restantes FROM reservations;
