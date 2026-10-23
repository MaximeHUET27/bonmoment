-- ============================================================================
-- Audit 2026-10 — C2 : écriture directe non restreinte sur reservations
-- ============================================================================
-- Le rôle authenticated avait INSERT et UPDATE sur TOUTES les colonnes de
-- reservations. La RLS limite aux lignes de l'utilisateur, mais celui-ci
-- pouvait via l'API REST Supabase : insérer une réservation sans passer par
-- reserver_bon (pas de décrément de stock), remettre un bon utilisee au
-- statut reservee, changer offre_id ou code_validation, ou supprimer sa
-- réservation sans passer par annuler_bon (pas de restitution de stock).
--
-- Seul write client direct légitime identifié : UPDATE qr_code_data après
-- reserver_bon (app/hooks/useReservation.js). Tout le reste (réservation,
-- annulation, validation, rappel) passe par des fonctions SECURITY DEFINER
-- ou par la clé service_role — ni l'une ni l'autre n'est affectée par ces
-- REVOKE, qui ne portent que sur le rôle authenticated.
-- ============================================================================

BEGIN;

REVOKE INSERT, DELETE, UPDATE ON public.reservations FROM authenticated;
REVOKE INSERT, DELETE, UPDATE ON public.reservations FROM anon;

GRANT UPDATE (qr_code_data) ON public.reservations TO authenticated;

COMMIT;
