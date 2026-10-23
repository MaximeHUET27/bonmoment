-- ============================================================================
-- Rollback : M7 — supprime la fonction et la table de rate limiting partage
-- ============================================================================
-- ATTENTION : si ce rollback est applique, lib/rate-limit.js (version
-- post-M7) echouera a chaque appel RPC (error journalisee, requete
-- laissee passer — voir le commentaire dans lib/rate-limit.js). Revenir
-- aussi au code applicatif d'avant M7 (git revert du commit M7) pour
-- retrouver un rate limiting fonctionnel, meme en memoire.
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.check_rate_limit(text, integer, integer);
DROP TABLE IF EXISTS public.rate_limits;

COMMIT;
