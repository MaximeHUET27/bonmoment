BEGIN;
DROP TABLE IF EXISTS participations_offres CASCADE;
DROP FUNCTION IF EXISTS get_offres_collectives_commerce(UUID);
DROP FUNCTION IF EXISTS get_participants_offre(UUID);
COMMIT;
