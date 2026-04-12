-- Index de performance — à exécuter dans Supabase SQL Editor
-- Ces index accélèrent les requêtes courantes sur les tables principales

CREATE INDEX IF NOT EXISTS idx_commerces_owner_id   ON public.commerces(owner_id);
CREATE INDEX IF NOT EXISTS idx_offres_commerce_id   ON public.offres(commerce_id);
CREATE INDEX IF NOT EXISTS idx_offres_statut         ON public.offres(statut);
CREATE INDEX IF NOT EXISTS idx_offres_date_fin       ON public.offres(date_fin);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id  ON public.reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_offre_id ON public.reservations(offre_id);
CREATE INDEX IF NOT EXISTS idx_reservations_statut   ON public.reservations(statut);
CREATE INDEX IF NOT EXISTS idx_villes_active         ON public.villes(active);
