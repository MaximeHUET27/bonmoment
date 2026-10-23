-- ============================================================================
-- Test post-migration — C3 : fonctions de fidelite
-- ============================================================================

-- 1. anon ne peut plus executer les 5 fonctions
SET ROLE anon;
SELECT * FROM enregistrer_passage_fidelite('00000000-0000-0000-0000-000000000000', 'telephone', '0600000000');
-- Attendu : ERREUR "permission denied for function enregistrer_passage_fidelite"
RESET ROLE;

-- 2. authenticated non-proprietaire se fait refuser par le garde-fou applicatif
--    (remplacer les UUID par un commerce et un user authenticated réels non liés)
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<uuid_user_non_proprietaire>';
-- SELECT success, message FROM enregistrer_passage_fidelite('<uuid_commerce_dont_il_n_est_pas_owner>', 'telephone', '0600000001');
-- Attendu : success = false, message = 'Non autorisé'
-- RESET ROLE;

-- 3. Les 4 fonctions deja protegees repondent toujours correctement a un
--    appel non autorise (non-regression du garde-fou existant)
SET ROLE anon;
SELECT * FROM ajuster_tampons_manuel('00000000-0000-0000-0000-000000000000', 1, 'test');
-- Attendu : ERREUR "permission denied" (anon n'a plus EXECUTE)
RESET ROLE;

-- 4. search_path fixe sur les 5 fonctions
SELECT p.proname, p.proconfig
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('enregistrer_passage_fidelite','ajuster_tampons_manuel',
                     'annuler_passage_fidelite','confirmer_recompense_remise',
                     'mettre_a_jour_programme_fidelite');
-- Attendu : proconfig contient {search_path=public} pour les 5 lignes

-- 5. Usage legitime (a executer manuellement avec un vrai commercant
--    proprietaire d'un commerce avec programme fidelite actif) :
--    vérifier via /commercant/valider que QR / code / téléphone / consultation
--    fonctionnent toujours à l'identique.
