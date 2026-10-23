-- ============================================================================
-- Audit 2026-10 — m4 (mineur, mais critique en pratique) : UPDATE sur
-- TOUTES les colonnes de users pour authenticated
-- ============================================================================
-- Un utilisateur authentifie pouvait, via l'API REST Supabase, modifier
-- n'importe quelle colonne de sa propre ligne — y compris role,
-- badge_niveau, notes_admin, email. En particulier :
-- UPDATE users SET role='admin' WHERE id=auth.uid() aurait fonctionne.
--
-- Colonnes reellement ecrites par le client (grep exhaustif) :
-- notifications_email, notifications_email_push, notifications_push,
-- villes_abonnees, commerces_abonnes, et role (uniquement la transition
-- client -> commercant, a l'inscription commercant).
--
-- Un trigger verrouille en plus les valeurs possibles de role : seule la
-- transition client -> commercant est autorisee pour un appelant non
-- service_role, quelle que soit la colonne desormais grantable.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.users_role_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.role() = 'service_role' THEN
      RETURN NEW;
    END IF;
    IF OLD.role = 'client' AND NEW.role = 'commercant' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Transition de role non autorisee (% -> %)', OLD.role, NEW.role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_role_guard ON public.users;
CREATE TRIGGER trg_users_role_guard
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.users_role_guard();

REVOKE UPDATE ON public.users FROM authenticated;

GRANT UPDATE (
  notifications_email, notifications_email_push, notifications_push,
  villes_abonnees, commerces_abonnes, role
) ON public.users TO authenticated;

COMMIT;
