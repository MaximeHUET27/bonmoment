-- Migration : ajout colonnes dashboard commerçant
-- À exécuter dans Supabase SQL Editor

ALTER TABLE public.commerces
  ADD COLUMN IF NOT EXISTS maps_url text,
  ADD COLUMN IF NOT EXISTS palier   integer DEFAULT 1;

-- Commentaires pour documentation
COMMENT ON COLUMN public.commerces.maps_url IS 'URL Google Maps personnalisée pour ce commerce';
COMMENT ON COLUMN public.commerces.palier   IS 'Palier d''abonnement : 1=Découverte, 2=Essentiel, 3=Pro';
