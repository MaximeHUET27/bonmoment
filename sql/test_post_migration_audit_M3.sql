-- ============================================================================
-- Test post-migration — M3 : scope du code_validation
-- ============================================================================

-- 1. Index unique partiel en place
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename='reservations' AND indexname='reservations_offre_code_actif_unique';
-- Attendu : 1 ligne, indexdef contient "WHERE (statut <> 'annulee'::text)"

-- 2. Une tentative d'insertion d'un doublon (offre_id, code_validation) non
--    annulee echoue desormais (executer avec deux reservations existantes
--    de meme offre, en test uniquement — ne pas executer sur des lignes
--    reelles sans environnement de test) :
-- INSERT INTO reservations (user_id, offre_id, code_validation, statut)
--   SELECT user_id, offre_id, code_validation, 'reservee'
--   FROM reservations WHERE statut <> 'annulee' LIMIT 1;
-- Attendu : ERREUR duplicate key value violates unique constraint

-- 3. Non-regression manuelle : /commercant/valider doit toujours accepter
--    un code valide pour le bon commerce, refuser un code d'un autre
--    commerce ("Code invalide"), et un membre mairie/asso doit toujours
--    pouvoir valider les bons des commerces membres.
