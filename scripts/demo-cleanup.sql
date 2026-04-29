-- BONMOMENT — Suppression données démo Le Neubourg
-- Lancer après les screenshots pour tout effacer en une fois

BEGIN;

-- Réservations liées aux offres démo
DELETE FROM public.reservations
WHERE offre_id IN (
  SELECT id FROM public.offres
  WHERE commerce_id IN (
    SELECT id FROM public.commerces WHERE description LIKE '[DEMO]%'
  )
);

-- Offres démo
DELETE FROM public.offres
WHERE commerce_id IN (
  SELECT id FROM public.commerces WHERE description LIKE '[DEMO]%'
);

-- Commerces démo
DELETE FROM public.commerces WHERE description LIKE '[DEMO]%';

-- Users démo (public + auth)
DELETE FROM public.users WHERE email LIKE 'demo_%@fake.test';
DELETE FROM auth.users  WHERE email LIKE 'demo_%@fake.test';

COMMIT;
