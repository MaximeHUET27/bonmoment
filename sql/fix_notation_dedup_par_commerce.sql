-- ═══════════════════════════════════════════════════════════════════════════
-- PATCH : Déduplication notation Google par (user_id, commerce_id)
-- Étend le système de notation aux tampons fidélité
-- Idempotent : safe à exécuter plusieurs fois
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. reservation_id nullable dans les deux tables
--    (les tampons fidélité n'ont pas de réservation associée)
ALTER TABLE avis_google_clics ALTER COLUMN reservation_id DROP NOT NULL;
ALTER TABLE feedbacks_commerce ALTER COLUMN reservation_id DROP NOT NULL;

-- 2. Colonne source pour tracer l'origine de la demande de notation
ALTER TABLE avis_google_clics
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'bon'
  CHECK (source IN ('bon', 'tampon'));

ALTER TABLE feedbacks_commerce
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'bon'
  CHECK (source IN ('bon', 'tampon'));

-- 3. Index pour la requête de déduplication par (user_id, commerce_id)
CREATE INDEX IF NOT EXISTS idx_avis_google_user_commerce
  ON avis_google_clics(user_id, commerce_id);

CREATE INDEX IF NOT EXISTS idx_feedbacks_user_commerce
  ON feedbacks_commerce(user_id, commerce_id);

-- 4. Politique RLS : le client peut lire ses propres lignes
--    Nécessaire pour que ReviewPolling vérifie côté client si le commerce
--    a déjà été noté, sans passer par un endpoint serveur dédié.
--    DROP IF EXISTS + CREATE pour idempotence.
DROP POLICY IF EXISTS "select_own_user" ON avis_google_clics;
CREATE POLICY "select_own_user" ON avis_google_clics
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "select_own_user" ON feedbacks_commerce;
CREATE POLICY "select_own_user" ON feedbacks_commerce
  FOR SELECT USING (user_id = auth.uid());
