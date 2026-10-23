-- ============================================================================
-- Audit 2026-10 — m2 (mineur) : fonctions SECURITY DEFINER sans search_path
-- ============================================================================
-- Sans search_path fixe, une fonction SECURITY DEFINER peut etre detournee
-- si un objet de meme nom est cree dans un schema place avant "public"
-- dans le search_path de l'appelant. Simple ajout, aucun changement de
-- logique. (enregistrer_passage_fidelite, ajuster_tampons_manuel,
-- annuler_passage_fidelite, confirmer_recompense_remise,
-- mettre_a_jour_programme_fidelite deja traitees par C3/M3.)
--
-- Non touche ici (risque de regression a tester en conditions reelles,
-- hors de ce lot) : vue_base_client_fidelite (passage a
-- security_invoker necessiterait de revalider son acces sous RLS).
-- Non touche : pg_net (cron bonmoment-rappel-h2 en depend, ne pas deplacer).
-- ============================================================================

BEGIN;

ALTER FUNCTION public.activer_carte_fidelite_client(text) SET search_path = public;
ALTER FUNCTION public.annuler_bon(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.check_rate_limit_fidelite(uuid) SET search_path = public;
ALTER FUNCTION public.desactiver_fidelite_client() SET search_path = public;
ALTER FUNCTION public.modifier_telephone_client(text) SET search_path = public;
ALTER FUNCTION public.peut_utiliser_fidelite(uuid) SET search_path = public;
ALTER FUNCTION public.reserver_bon(uuid, uuid) SET search_path = public;

COMMIT;
