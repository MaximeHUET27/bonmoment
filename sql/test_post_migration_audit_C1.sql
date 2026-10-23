-- ============================================================================
-- Test post-migration — C1 : bucket commerces-photos
-- ============================================================================

-- 1. Les restrictions sont bien posées
SELECT id, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'commerces-photos';
-- Attendu : file_size_limit = 2097152, allowed_mime_types = {image/webp,image/jpeg,image/jpg,image/png}

-- 2. offres-photos inchangé (référence)
SELECT id, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'offres-photos';
-- Attendu : identique à avant (2097152, les mêmes 4 types)
