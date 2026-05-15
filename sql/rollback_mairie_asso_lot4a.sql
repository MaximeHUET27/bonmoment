-- ============================================================================
-- ROLLBACK : Module Mairie / Association — LOT 4A
-- ============================================================================
-- Supprime uniquement les éléments ajoutés par le Lot 4A.
-- Ne touche pas aux Lots 1, 2 et 3.
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS get_stats_cumulees_mairie_asso(UUID, TEXT);

-- Note : on ne supprime PAS commerces.nb_avis_google
-- car le champ est neutre et peut être utile pour les commerces classiques aussi.
-- Pour le supprimer explicitement si nécessaire :
-- ALTER TABLE commerces DROP COLUMN IF EXISTS nb_avis_google;

-- Pour le bucket Storage : à supprimer manuellement dans le dashboard Supabase
-- si rollback complet (Storage → logos-mairie-asso → Delete bucket).

COMMIT;
