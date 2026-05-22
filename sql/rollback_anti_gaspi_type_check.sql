-- ============================================================================
-- Rollback : Retire 'anti_gaspi' du CHECK constraint offres.type_remise
-- ============================================================================
-- ⚠️  AVERTISSEMENT : Si des offres avec type_remise='anti_gaspi' existent en
--     BDD, le ADD CONSTRAINT ÉCHOUERA (violation de contrainte sur lignes
--     existantes). Avant rollback, vérifier :
--       SELECT COUNT(*) FROM offres WHERE type_remise = 'anti_gaspi';
--     Si > 0 : soit supprimer/modifier ces lignes, soit ne pas rollback.
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
  'offert'::text
]));

COMMIT;

-- Vérification post-rollback
SELECT pg_get_constraintdef(oid) AS definition_constraint
FROM pg_constraint
WHERE conname = 'offres_type_remise_check';
