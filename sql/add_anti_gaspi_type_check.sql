-- ============================================================================
-- Migration : Ajout du type 'anti_gaspi' au CHECK constraint offres.type_remise
-- ============================================================================
-- Date         : 2026-05-23
-- Contexte     : Feature anti-gaspi livrée (commits 8e9c3f6, 5a26419, ad2ce8d)
--                Le CHECK constraint bloquait l'insertion → migration corrective.
-- Risque       : Très faible. DROP + ADD sur un CHECK, zéro impact sur les
--                lignes existantes. Toutes les valeurs antérieures restent
--                autorisées.
-- Rollback     : sql/rollback_anti_gaspi_type_check.sql
-- Test         : sql/test_post_migration_anti_gaspi.sql
-- ============================================================================
-- NOTE : Cette migration a déjà été exécutée manuellement en prod le 2026-05-23
--        pour débloquer la création d'offres anti-gaspi.
--        Ce fichier sert de traçabilité — il est idempotent (DROP IF EXISTS).
-- ============================================================================

BEGIN;

ALTER TABLE offres DROP CONSTRAINT IF EXISTS offres_type_remise_check;

ALTER TABLE offres ADD CONSTRAINT offres_type_remise_check
CHECK (type_remise = ANY (ARRAY[
  'pourcentage'::text,
  'montant_fixe'::text,
  'montant'::text,
  'cadeau'::text,
  'produit_offert'::text,
  'service_offert'::text,
  'concours'::text,
  'atelier'::text,
  'fidelite'::text,
  'offert'::text,
  'anti_gaspi'::text
]));

COMMIT;

-- Vérification post-migration
SELECT pg_get_constraintdef(oid) AS definition_constraint
FROM pg_constraint
WHERE conname = 'offres_type_remise_check';
