-- Permet à un utilisateur authentifié de lire une offre
-- même si elle n'est plus active, dès lors qu'il a une réservation sur cette offre.
-- Nécessaire pour afficher le titre/commerce dans "Mes bons utilisés/expirés".

CREATE POLICY "offres_select_own_reservation"
  ON public.offres FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reservations
      WHERE reservations.offre_id = offres.id
        AND reservations.user_id = auth.uid()
    )
  );
