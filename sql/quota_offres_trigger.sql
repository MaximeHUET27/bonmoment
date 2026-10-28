-- ============================================================
-- SÉCURITÉ : quota mensuel d'offres vérifié EN BASE
--
-- Faille fermée : la policy RLS offres_insert_owner autorise un
-- commerçant authentifié à insérer une offre directement via l'API
-- Supabase (clé anon + JWT), sans passer par /api/offres qui seul
-- vérifiait le quota. Avec l'offre gratuite Basic (1 offre/mois),
-- le contournement devenait tentant.
--
-- Ce trigger applique la même règle que lib/paliers.js, pour TOUS
-- les chemins d'insertion (client direct ET route serveur) :
--   basic / NULL / inconnu → 1 offre par mois calendaire (UTC)
--   essentiel              → 8
--   pro                    → illimité
-- Comptage identique à /api/offres : offres du commerce dont
-- created_at >= 1er du mois (UTC), tous statuts confondus.
--
-- SECURITY DEFINER : le comptage doit voir toutes les offres du
-- commerce (la policy SELECT publique masque annulee/programmee).
-- Verrou transactionnel par commerce : pas de dépassement par
-- requêtes concurrentes. Aucun grant ni policy modifié.
-- ============================================================

CREATE OR REPLACE FUNCTION public.verifier_quota_offres()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_palier  TEXT;
  v_limite  INTEGER;
  v_debut   TIMESTAMPTZ;
  v_count   INTEGER;
BEGIN
  SELECT palier INTO v_palier FROM public.commerces WHERE id = NEW.commerce_id;

  v_limite := CASE v_palier
                WHEN 'pro'       THEN NULL
                WHEN 'essentiel' THEN 8
                ELSE 1                       -- basic, NULL ou valeur inconnue
              END;

  IF v_limite IS NULL THEN
    RETURN NEW;
  END IF;

  -- Sérialise les insertions d'un même commerce jusqu'à la fin de la transaction
  PERFORM pg_advisory_xact_lock(hashtextextended('quota_offres:' || NEW.commerce_id::text, 0));

  v_debut := date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';

  SELECT count(*) INTO v_count
    FROM public.offres
   WHERE commerce_id = NEW.commerce_id
     AND created_at >= v_debut;

  IF v_count >= v_limite THEN
    RAISE EXCEPTION 'QUOTA_OFFRES_ATTEINT'
      USING ERRCODE = 'P0001',
            DETAIL  = format('Palier %s : %s offre(s) par mois', coalesce(v_palier, 'basic'), v_limite);
  END IF;

  RETURN NEW;
END;
$$;

-- La fonction n'est appelée que par le trigger : pas d'exécution directe
REVOKE ALL ON FUNCTION public.verifier_quota_offres() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_verifier_quota_offres ON public.offres;
CREATE TRIGGER trg_verifier_quota_offres
  BEFORE INSERT ON public.offres
  FOR EACH ROW
  EXECUTE FUNCTION public.verifier_quota_offres();

-- ============================================================
-- ROLLBACK
-- DROP TRIGGER IF EXISTS trg_verifier_quota_offres ON public.offres;
-- DROP FUNCTION IF EXISTS public.verifier_quota_offres();
-- ============================================================
