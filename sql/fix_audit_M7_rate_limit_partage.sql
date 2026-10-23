-- ============================================================================
-- Audit 2026-10 — M7 : rate limiting en memoire non partage entre instances
-- ============================================================================
-- lib/rate-limit.js stockait les compteurs dans une Map en memoire, propre
-- a chaque instance serverless Vercel : la limite reelle etait
-- maxRequests x nb_instances_concurrentes, pas maxRequests. Remplace par
-- une table partagee + une fonction atomique (INSERT ... ON CONFLICT,
-- un seul aller-retour, pas de race condition entre deux requetes
-- concurrentes sur la meme cle).
--
-- Fenetre fixe (pas glissante au sens strict) : au premier depassement
-- de windowMs depuis le debut de la fenetre en cours, le compteur
-- redemarre a 1. Suffisant pour le besoin (proteger contre un flot de
-- requetes), plus simple et moins couteux qu'une fenetre glissante exacte.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key          text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  count        integer NOT NULL DEFAULT 1
);

-- Pas de RLS necessaire : jamais appelee par anon/authenticated
-- directement, uniquement via check_rate_limit() (SECURITY DEFINER)
-- depuis lib/rate-limit.js avec la cle service_role.
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_max integer, p_window_ms integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now   timestamptz := clock_timestamp();
  v_count integer;
BEGIN
  INSERT INTO rate_limits (key, window_start, count)
  VALUES (p_key, v_now, 1)
  ON CONFLICT (key) DO UPDATE
    SET count = CASE
          WHEN rate_limits.window_start < v_now - (p_window_ms || ' milliseconds')::interval
            THEN 1
          ELSE rate_limits.count + 1
        END,
        window_start = CASE
          WHEN rate_limits.window_start < v_now - (p_window_ms || ' milliseconds')::interval
            THEN v_now
          ELSE rate_limits.window_start
        END
  RETURNING count INTO v_count;

  RETURN v_count <= p_max;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;

COMMIT;
