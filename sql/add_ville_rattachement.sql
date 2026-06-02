-- Migration : ville de rattachement (admin-only)
-- Permet d'affecter un commerce périphérique à une ville-centre active
-- sans modifier son adresse ni son flow d'inscription/refresh Google.
--
-- À exécuter dans l'éditeur SQL Supabase (SQL Editor).

ALTER TABLE public.commerces
  ADD COLUMN IF NOT EXISTS ville_rattachement text NULL;

-- Trigger : si ville_rattachement est renseignée, elle prend le dessus sur
-- la colonne ville à chaque INSERT ou UPDATE (y compris refresh Google).
-- No-op si ville_rattachement est vide ou null.
CREATE OR REPLACE FUNCTION public.apply_ville_rattachement()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.ville_rattachement IS NOT NULL AND NEW.ville_rattachement <> '' THEN
    NEW.ville := NEW.ville_rattachement;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_ville_rattachement ON public.commerces;
CREATE TRIGGER trg_apply_ville_rattachement
  BEFORE INSERT OR UPDATE ON public.commerces
  FOR EACH ROW EXECUTE FUNCTION public.apply_ville_rattachement();

-- Sécurité : seul le service role peut écrire ville_rattachement.
-- SELECT intentionnellement non révoqué : les select('*') existants restent intacts.
REVOKE INSERT, UPDATE (ville_rattachement) ON public.commerces FROM authenticated, anon;

-- Vérification post-migration :
-- SELECT has_column_privilege('authenticated','public.commerces','ville_rattachement','UPDATE'); -- doit retourner false
-- SELECT has_column_privilege('service_role','public.commerces','ville_rattachement','UPDATE');  -- doit retourner true
-- SELECT has_column_privilege('authenticated','public.commerces','ville_rattachement','SELECT'); -- doit retourner true
