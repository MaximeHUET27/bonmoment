-- ============================================================
-- Module Admin Refonte — Migrations SQL
-- À exécuter dans Supabase SQL Editor
-- ============================================================

ALTER TABLE commerces ADD COLUMN IF NOT EXISTS notes_admin TEXT;
ALTER TABLE users     ADD COLUMN IF NOT EXISTS notes_admin TEXT;
