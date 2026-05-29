-- Migration additive : colonnes attendues par le code admin, absentes en prod
-- À exécuter dans Supabase > SQL Editor (Prod)

ALTER TABLE public.commerces
  ADD COLUMN IF NOT EXISTS notes_admin    text,
  ADD COLUMN IF NOT EXISTS last_login_at  timestamptz,
  ADD COLUMN IF NOT EXISTS date_fin_essai timestamptz;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notes_admin    text;
