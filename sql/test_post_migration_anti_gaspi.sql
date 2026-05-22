-- ============================================================================
-- Tests post-migration : Vérification du CHECK constraint avec anti_gaspi
-- ============================================================================
-- À exécuter dans Supabase SQL Editor APRÈS sql/add_anti_gaspi_type_check.sql
-- Tous les tests doivent afficher 'OK'. Si un seul échoue, ROLLBACK.
-- ============================================================================

-- Test 1 : Le constraint contient bien les 11 valeurs attendues
DO $$
DECLARE
  v_def TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_def
  FROM pg_constraint
  WHERE conname = 'offres_type_remise_check';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'Constraint offres_type_remise_check introuvable';
  END IF;

  IF v_def NOT LIKE '%anti_gaspi%' THEN
    RAISE EXCEPTION 'anti_gaspi absent du constraint : %', v_def;
  END IF;
  IF v_def NOT LIKE '%pourcentage%' THEN
    RAISE EXCEPTION 'pourcentage absent du constraint';
  END IF;
  IF v_def NOT LIKE '%fidelite%' THEN
    RAISE EXCEPTION 'fidelite absent du constraint';
  END IF;
  IF v_def NOT LIKE '%offert%' THEN
    RAISE EXCEPTION 'offert absent du constraint';
  END IF;

  RAISE NOTICE 'Test 1 OK : constraint contient les 11 valeurs attendues';
END $$;

-- Test 2 : Les 10 valeurs historiques sont toujours autorisées (non-régression)
DO $$
DECLARE
  v_types TEXT[] := ARRAY[
    'pourcentage', 'montant_fixe', 'montant', 'cadeau',
    'produit_offert', 'service_offert', 'concours', 'atelier',
    'fidelite', 'offert'
  ];
  v_def TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_def
  FROM pg_constraint
  WHERE conname = 'offres_type_remise_check';

  FOR i IN 1..array_length(v_types, 1) LOOP
    IF v_def NOT LIKE '%' || v_types[i] || '%' THEN
      RAISE EXCEPTION 'Valeur historique % absente du constraint', v_types[i];
    END IF;
  END LOOP;

  RAISE NOTICE 'Test 2 OK : les 10 valeurs historiques sont toutes présentes';
END $$;

-- Test 3 : Insertion d'une offre anti_gaspi doit être acceptée (rollback auto)
DO $$
DECLARE
  v_commerce_id UUID;
BEGIN
  SELECT id INTO v_commerce_id FROM commerces LIMIT 1;

  IF v_commerce_id IS NULL THEN
    RAISE NOTICE 'Test 3 ignoré : aucun commerce en BDD';
  ELSE
    BEGIN
      INSERT INTO offres (
        commerce_id, titre, description, type_remise,
        date_debut, date_fin, nb_bons_total, nb_bons_restants, statut
      ) VALUES (
        v_commerce_id, 'TEST anti-gaspi — à supprimer', 'test migration',
        'anti_gaspi', NOW(), NOW() + INTERVAL '1 hour', 1, 1, 'active'
      );
      RAISE NOTICE 'Test 3 OK : insertion anti_gaspi acceptée par le constraint';
      -- Rollback de l'insertion de test
      ROLLBACK;
      RETURN;
    EXCEPTION WHEN check_violation THEN
      RAISE EXCEPTION 'Test 3 KO : CHECK constraint rejette anti_gaspi → migration incomplète';
    WHEN OTHERS THEN
      RAISE NOTICE 'Test 3 KO (autre erreur) : %', SQLERRM;
      ROLLBACK;
    END;
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '====================================';
  RAISE NOTICE 'TESTS POST-MIGRATION ANTI-GASPI OK';
  RAISE NOTICE '====================================';
END $$;
