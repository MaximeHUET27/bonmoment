-- ============================================================
-- Migration : Partial unique index sur reservations
-- Garantit qu'un utilisateur ne peut avoir qu'une seule
-- réservation non-annulée par offre, tout en autorisant
-- la ré-réservation après annulation.
-- ============================================================

-- Supprimer l'éventuel index/contrainte unique existant(e)
-- (adapter le nom si nécessaire selon votre schéma Supabase)
DROP INDEX IF EXISTS reservations_user_id_offre_id_key;
DROP INDEX IF EXISTS unique_user_offre;

-- Partial unique index : une seule ligne active (non annulée)
-- par couple (user_id, offre_id)
CREATE UNIQUE INDEX IF NOT EXISTS reservations_user_offre_active_unique
  ON reservations(user_id, offre_id)
  WHERE statut != 'annulee';

-- Note : le code front-end (useReservation.js) effectue déjà
-- un UPDATE (et non un INSERT) pour réactiver une réservation
-- annulée existante, donc la contrainte ne sera jamais violée
-- lors d'une ré-réservation post-annulation.
