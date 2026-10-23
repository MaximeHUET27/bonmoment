-- ============================================================================
-- Audit 2026-10 — C1 : bucket "commerces-photos" sans limite ni restriction
-- ============================================================================
-- Aligne commerces-photos sur offres-photos (déjà correctement restreint) :
-- limite de taille et types MIME acceptés. Combiné au correctif applicatif
-- de app/api/upload-photo-commerce/route.js (session + ownership + liste
-- blanche de domaines + vérification du content-type réel).
-- ============================================================================

BEGIN;

UPDATE storage.buckets
SET file_size_limit   = 2097152, -- 2 Mo, identique à offres-photos
    allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/jpg', 'image/png']
WHERE id = 'commerces-photos';

COMMIT;
