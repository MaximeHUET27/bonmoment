-- ============================================================================
-- Rollback : m2-mineur — retire search_path des 7 fonctions
-- ============================================================================

BEGIN;

ALTER FUNCTION public.activer_carte_fidelite_client(text) RESET search_path;
ALTER FUNCTION public.annuler_bon(uuid, uuid) RESET search_path;
ALTER FUNCTION public.check_rate_limit_fidelite(uuid) RESET search_path;
ALTER FUNCTION public.desactiver_fidelite_client() RESET search_path;
ALTER FUNCTION public.modifier_telephone_client(text) RESET search_path;
ALTER FUNCTION public.peut_utiliser_fidelite(uuid) RESET search_path;
ALTER FUNCTION public.reserver_bon(uuid, uuid) RESET search_path;

COMMIT;
