-- ============================================================================
-- TESTS POST-MIGRATION : CARTE FIDÉLITÉ UNIVERSELLE
-- À exécuter immédiatement après add_fidelite_universelle.sql
--
-- RÈGLE ABSOLUE : si un seul test retourne 'KO CRITIQUE'
--                → exécuter rollback_fidelite_universelle.sql immédiatement
-- ============================================================================

-- ── Bloc 1 : Intégrité des tables existantes (NON-RÉGRESSION CRITIQUE) ────────

SELECT 'RPC reserver_bon existe toujours' AS test,
  CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'reserver_bon')
       THEN 'OK' ELSE 'KO CRITIQUE' END AS result;

SELECT 'Table reservations intacte — colonne statut' AS test,
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'reservations' AND column_name = 'statut'
  ) THEN 'OK' ELSE 'KO CRITIQUE' END AS result;

SELECT 'Table users — colonne email toujours présente' AS test,
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'users' AND column_name = 'email'
  ) THEN 'OK' ELSE 'KO CRITIQUE' END AS result;

SELECT 'Table users — colonne nom toujours présente' AS test,
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'users' AND column_name = 'nom'
  ) THEN 'OK' ELSE 'KO CRITIQUE' END AS result;

SELECT 'Table commerces — colonne palier toujours présente' AS test,
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'commerces' AND column_name = 'palier'
  ) THEN 'OK' ELSE 'KO CRITIQUE' END AS result;

SELECT 'Table commerces — colonne abonnement_actif toujours présente' AS test,
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'commerces' AND column_name = 'abonnement_actif'
  ) THEN 'OK' ELSE 'KO CRITIQUE' END AS result;

SELECT 'Signature RPC reserver_bon intacte' AS test,
  CASE WHEN (
    SELECT pg_get_function_arguments(oid)
      FROM pg_proc
     WHERE proname = 'reserver_bon'
  ) LIKE '%p_offre_id%'
       THEN 'OK' ELSE 'KO CRITIQUE' END AS result;

-- ── Bloc 2 : Nouvelles colonnes ───────────────────────────────────────────────

SELECT 'Colonne users.telephone ajoutée (NULLABLE)' AS test,
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'users'
       AND column_name = 'telephone'
       AND is_nullable = 'YES'
  ) THEN 'OK' ELSE 'KO' END AS result;

SELECT 'Index unique idx_users_telephone_unique créé' AS test,
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_telephone_unique'
  ) THEN 'OK' ELSE 'KO' END AS result;

-- ── Bloc 3 : Nouvelles tables ─────────────────────────────────────────────────

SELECT 'Table users_light créée' AS test,
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.tables WHERE table_name = 'users_light'
  ) THEN 'OK' ELSE 'KO' END AS result;

SELECT 'Table programmes_fidelite créée' AS test,
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.tables WHERE table_name = 'programmes_fidelite'
  ) THEN 'OK' ELSE 'KO' END AS result;

SELECT 'Table cartes_fidelite créée' AS test,
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.tables WHERE table_name = 'cartes_fidelite'
  ) THEN 'OK' ELSE 'KO' END AS result;

SELECT 'Table passages_fidelite créée' AS test,
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.tables WHERE table_name = 'passages_fidelite'
  ) THEN 'OK' ELSE 'KO' END AS result;

SELECT 'Table fidelite_flags_antifraude créée' AS test,
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.tables WHERE table_name = 'fidelite_flags_antifraude'
  ) THEN 'OK' ELSE 'KO' END AS result;

-- ── Bloc 4 : RLS activé sur toutes les nouvelles tables ──────────────────────

SELECT 'RLS actif sur users_light' AS test,
  CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'users_light') = TRUE
       THEN 'OK' ELSE 'KO' END AS result;

SELECT 'RLS actif sur programmes_fidelite' AS test,
  CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'programmes_fidelite') = TRUE
       THEN 'OK' ELSE 'KO' END AS result;

SELECT 'RLS actif sur cartes_fidelite' AS test,
  CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'cartes_fidelite') = TRUE
       THEN 'OK' ELSE 'KO' END AS result;

SELECT 'RLS actif sur passages_fidelite' AS test,
  CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'passages_fidelite') = TRUE
       THEN 'OK' ELSE 'KO' END AS result;

SELECT 'RLS actif sur fidelite_flags_antifraude' AS test,
  CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'fidelite_flags_antifraude') = TRUE
       THEN 'OK' ELSE 'KO' END AS result;

-- ── Bloc 5 : RPCs créées ──────────────────────────────────────────────────────

SELECT 'RPC enregistrer_passage_fidelite' AS test,
  CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'enregistrer_passage_fidelite')
       THEN 'OK' ELSE 'KO' END AS result;

SELECT 'RPC annuler_passage_fidelite' AS test,
  CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'annuler_passage_fidelite')
       THEN 'OK' ELSE 'KO' END AS result;

SELECT 'RPC ajuster_tampons_manuel' AS test,
  CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'ajuster_tampons_manuel')
       THEN 'OK' ELSE 'KO' END AS result;

SELECT 'RPC confirmer_recompense_remise' AS test,
  CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'confirmer_recompense_remise')
       THEN 'OK' ELSE 'KO' END AS result;

SELECT 'RPC activer_carte_fidelite_client' AS test,
  CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'activer_carte_fidelite_client')
       THEN 'OK' ELSE 'KO' END AS result;

SELECT 'RPC desactiver_fidelite_client' AS test,
  CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'desactiver_fidelite_client')
       THEN 'OK' ELSE 'KO' END AS result;

SELECT 'RPC modifier_telephone_client' AS test,
  CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'modifier_telephone_client')
       THEN 'OK' ELSE 'KO' END AS result;

SELECT 'RPC mettre_a_jour_programme_fidelite' AS test,
  CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'mettre_a_jour_programme_fidelite')
       THEN 'OK' ELSE 'KO' END AS result;

SELECT 'RPC peut_utiliser_fidelite' AS test,
  CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'peut_utiliser_fidelite')
       THEN 'OK' ELSE 'KO' END AS result;

SELECT 'RPC check_rate_limit_fidelite' AS test,
  CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'check_rate_limit_fidelite')
       THEN 'OK' ELSE 'KO' END AS result;

-- ── Bloc 6 : Vue ─────────────────────────────────────────────────────────────

SELECT 'Vue vue_base_client_fidelite créée' AS test,
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.views WHERE table_name = 'vue_base_client_fidelite'
  ) THEN 'OK' ELSE 'KO' END AS result;

-- ── Bloc 7 : Vérification fonctionnelle de peut_utiliser_fidelite ─────────────
-- Ce test retourne FALSE (aucun commerce Pro en test) — c'est normal.
-- Il vérifie que la fonction est APPELABLE sans erreur.

SELECT 'Fonction peut_utiliser_fidelite appelable' AS test,
  CASE WHEN peut_utiliser_fidelite(uuid_generate_v4()) IS NOT NULL
       THEN 'OK' ELSE 'KO' END AS result;

-- ── Bloc 8 : Vérification que palier = 'pro' est la bonne valeur ──────────────
-- Confirme que la colonne palier existe bien en TEXT (pas integer)

SELECT 'Colonne commerces.palier est de type TEXT' AS test,
  CASE WHEN (
    SELECT data_type FROM information_schema.columns
     WHERE table_name = 'commerces' AND column_name = 'palier'
  ) = 'text'
       THEN 'OK' ELSE 'KO — vérifier le type, attendu TEXT' END AS result;

-- ── Bloc 9 : Index créés ──────────────────────────────────────────────────────

SELECT 'Index idx_cartes_fidelite_commerce' AS test,
  CASE WHEN EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cartes_fidelite_commerce')
       THEN 'OK' ELSE 'KO' END AS result;

SELECT 'Index idx_cartes_fidelite_recompense' AS test,
  CASE WHEN EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cartes_fidelite_recompense')
       THEN 'OK' ELSE 'KO' END AS result;

SELECT 'Index idx_passages_carte' AS test,
  CASE WHEN EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'idx_passages_carte')
       THEN 'OK' ELSE 'KO' END AS result;

SELECT 'Index idx_passages_group' AS test,
  CASE WHEN EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'idx_passages_group')
       THEN 'OK' ELSE 'KO' END AS result;

-- ── Récapitulatif : compte les KO ────────────────────────────────────────────
-- Cette requête résume le résultat global. Si KO_count > 0, consulter les lignes ci-dessus.
-- (Cette requête est un guide — ne peut pas être exécutée directement dans Supabase SQL Editor
--  car elle dépend des résultats des requêtes précédentes. Compter visuellement les KO.)
SELECT
  'RÉSUMÉ : si tous les tests ci-dessus sont OK, la migration est validée. '
  || 'Sinon, exécuter rollback_fidelite_universelle.sql immédiatement.' AS instructions;
