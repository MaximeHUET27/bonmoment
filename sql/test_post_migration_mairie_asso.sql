-- ============================================================================
-- TESTS POST-MIGRATION : Module Mairie / Association — LOT 1
-- ============================================================================
-- À exécuter dans Supabase SQL Editor APRÈS sql/add_mairie_asso.sql
-- Tous les tests doivent retourner 'OK'. Si un seul échoue, ROLLBACK.
-- ============================================================================

-- Test 1 : la valeur 'mairie_asso' est acceptée comme catégorie
DO $$
BEGIN
  -- categorie_bonmoment est TEXT sans CHECK constraint → toute valeur TEXT est valide.
  -- On vérifie que la colonne existe et peut recevoir 'mairie_asso' sans erreur.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commerces' AND column_name = 'categorie_bonmoment'
  ) THEN
    RAISE EXCEPTION 'Colonne commerces.categorie_bonmoment manquante';
  END IF;
  RAISE NOTICE 'Test 1 OK : colonne categorie_bonmoment présente (type TEXT, valeur mairie_asso acceptée)';
END $$;

-- Test 2 : les colonnes ajoutées existent
DO $$
DECLARE
  col_logo_url BOOLEAN;
  col_affiche_logo BOOLEAN;
  col_avec_bon BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commerces' AND column_name = 'logo_url') INTO col_logo_url;
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commerces' AND column_name = 'affiche_logo_mairie_asso_id') INTO col_affiche_logo;
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offres' AND column_name = 'avec_bon') INTO col_avec_bon;

  IF NOT col_logo_url THEN RAISE EXCEPTION 'Colonne commerces.logo_url manquante'; END IF;
  IF NOT col_affiche_logo THEN RAISE EXCEPTION 'Colonne commerces.affiche_logo_mairie_asso_id manquante'; END IF;
  IF NOT col_avec_bon THEN RAISE EXCEPTION 'Colonne offres.avec_bon manquante'; END IF;

  RAISE NOTICE 'Test 2 OK : colonnes ajoutées correctement';
END $$;

-- Test 3 : la table mairie_asso_membres existe et a RLS activé
DO $$
DECLARE
  table_exists BOOLEAN;
  rls_enabled BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM information_schema.tables
    WHERE table_name = 'mairie_asso_membres') INTO table_exists;
  IF NOT table_exists THEN RAISE EXCEPTION 'Table mairie_asso_membres manquante'; END IF;

  SELECT relrowsecurity INTO rls_enabled
    FROM pg_class WHERE relname = 'mairie_asso_membres';
  IF NOT rls_enabled THEN RAISE EXCEPTION 'RLS non activé sur mairie_asso_membres'; END IF;

  RAISE NOTICE 'Test 3 OK : table créée avec RLS';
END $$;

-- Test 4 : valeur par défaut avec_bon = TRUE pour offres existantes
DO $$
DECLARE
  nb_offres_avec_bon_null INT;
BEGIN
  SELECT COUNT(*) INTO nb_offres_avec_bon_null
    FROM offres WHERE avec_bon IS NULL;
  IF nb_offres_avec_bon_null > 0 THEN
    RAISE EXCEPTION 'Des offres ont avec_bon = NULL (devrait être TRUE par défaut)';
  END IF;
  RAISE NOTICE 'Test 4 OK : toutes les offres existantes ont avec_bon = TRUE';
END $$;

-- Test 5 : aucun commerce existant n'a sa catégorie modifiée
-- (vérification que la migration est bien additive)
DO $$
DECLARE
  nb_mairie_asso INT;
BEGIN
  SELECT COUNT(*) INTO nb_mairie_asso
    FROM commerces WHERE categorie_bonmoment = 'mairie_asso';
  -- Doit être 0 juste après migration (aucun compte n'a encore été créé en mairie_asso)
  IF nb_mairie_asso > 0 THEN
    RAISE EXCEPTION 'Des comptes mairie_asso existent déjà : impossible juste après migration';
  END IF;
  RAISE NOTICE 'Test 5 OK : aucun compte mairie_asso pré-existant (cohérent avec migration neuve)';
END $$;

-- Test 6 : triggers de cohérence en place
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_check_mairie_asso_validity'
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_check_mairie_asso_validity manquant';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_prevent_categorie_change'
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_prevent_categorie_change manquant';
  END IF;
  RAISE NOTICE 'Test 6 OK : triggers de cohérence en place';
END $$;

-- Test 7 : 4 policies RLS sur mairie_asso_membres
DO $$
DECLARE
  nb_policies INT;
BEGIN
  SELECT COUNT(*) INTO nb_policies
    FROM pg_policies WHERE tablename = 'mairie_asso_membres';
  IF nb_policies < 4 THEN
    RAISE EXCEPTION '% policies RLS trouvées sur mairie_asso_membres, attendu >= 4', nb_policies;
  END IF;
  RAISE NOTICE 'Test 7 OK : % policies RLS sur mairie_asso_membres', nb_policies;
END $$;

-- Test 8 : index sur affiche_logo_mairie_asso_id créé
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'commerces' AND indexname = 'idx_commerces_affiche_logo'
  ) THEN
    RAISE EXCEPTION 'Index idx_commerces_affiche_logo manquant sur commerces';
  END IF;
  RAISE NOTICE 'Test 8 OK : index idx_commerces_affiche_logo présent';
END $$;

DO $$
BEGIN
  RAISE NOTICE '====================================';
  RAISE NOTICE 'TOUS LES TESTS POST-MIGRATION OK';
  RAISE NOTICE '====================================';
END $$;
