-- ============================================================
-- BONMOMENT — Migrations SQL
-- Abonnements villes, favoris commerces, notifications, QR code
-- À exécuter dans l'éditeur SQL de Supabase
-- ============================================================

-- 1. Table users : nouveaux champs
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS villes_abonnees      TEXT[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS commerces_abonnes    UUID[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notifications_email  BOOLEAN  DEFAULT true,
  ADD COLUMN IF NOT EXISTS notifications_push   BOOLEAN  DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_subscription    JSONB,
  ADD COLUMN IF NOT EXISTS badge_niveau         TEXT     DEFAULT 'habitant';

-- 2. Table commerces : champ QR code
ALTER TABLE commerces
  ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

-- 3. Index pour accélérer les requêtes email quotidien
CREATE INDEX IF NOT EXISTS idx_users_notif_email
  ON users (notifications_email, badge_niveau)
  WHERE notifications_email = true;

-- 4. Index pour les abonnements villes (recherche par ville dans tableau)
CREATE INDEX IF NOT EXISTS idx_users_villes_abonnees
  ON users USING GIN (villes_abonnees);

-- 5. Index pour les favoris commerces
CREATE INDEX IF NOT EXISTS idx_users_commerces_abonnes
  ON users USING GIN (commerces_abonnes);

-- ============================================================
-- RLS Policies (si pas déjà en place)
-- ============================================================

-- Assure que chaque utilisateur ne peut lire/modifier que son propre profil
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users' AND policyname = 'users_select_own'
  ) THEN
    CREATE POLICY users_select_own ON users
      FOR SELECT USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users' AND policyname = 'users_update_own'
  ) THEN
    CREATE POLICY users_update_own ON users
      FOR UPDATE USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users' AND policyname = 'users_delete_own'
  ) THEN
    CREATE POLICY users_delete_own ON users
      FOR DELETE USING (auth.uid() = id);
  END IF;
END $$;
