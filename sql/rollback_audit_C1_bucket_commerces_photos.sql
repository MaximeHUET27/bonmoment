-- ============================================================================
-- Rollback : C1 — retire la limite de taille / types MIME sur commerces-photos
-- ============================================================================

BEGIN;

UPDATE storage.buckets
SET file_size_limit   = NULL,
    allowed_mime_types = NULL
WHERE id = 'commerces-photos';

COMMIT;
