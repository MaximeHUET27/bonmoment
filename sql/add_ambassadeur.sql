-- Migration : colonnes ambassadeur sur la table commerces
-- À exécuter une fois dans Supabase > SQL Editor

ALTER TABLE public.commerces
  ADD COLUMN IF NOT EXISTS est_ambassadeur      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS date_fin_ambassadeur timestamptz NULL;
