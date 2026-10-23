-- ============================================================================
-- Rollback : C2 — redonne a authenticated INSERT/UPDATE/DELETE complets
-- sur reservations (etat pre-audit, y compris la faille)
-- ============================================================================

BEGIN;

GRANT INSERT, DELETE, UPDATE ON public.reservations TO authenticated;

COMMIT;
