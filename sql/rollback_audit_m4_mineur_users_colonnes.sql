-- ============================================================================
-- Rollback : m4-mineur — retire le trigger et redonne UPDATE complet a
-- authenticated sur users (etat pre-audit, y compris la faille)
-- ============================================================================

BEGIN;

DROP TRIGGER IF EXISTS trg_users_role_guard ON public.users;
DROP FUNCTION IF EXISTS public.users_role_guard();

GRANT UPDATE ON public.users TO authenticated;

COMMIT;
