-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : colonne cagnotte_parrainage_cents
-- À exécuter manuellement dans le SQL Editor Supabase
-- Date : 2026-06
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.commerces
  ADD COLUMN IF NOT EXISTS cagnotte_parrainage_cents integer NOT NULL DEFAULT 0;

REVOKE INSERT (cagnotte_parrainage_cents), UPDATE (cagnotte_parrainage_cents)
  ON public.commerces FROM anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Rollback :
-- ALTER TABLE public.commerces DROP COLUMN IF EXISTS cagnotte_parrainage_cents;
-- ─────────────────────────────────────────────────────────────────────────────
