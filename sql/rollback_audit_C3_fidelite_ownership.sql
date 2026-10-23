-- ============================================================================
-- Rollback : C3 — fonctions de fidelite (retire le garde-fou de propriete,
-- redonne EXECUTE a anon/public, retire search_path)
-- ============================================================================
-- ATTENTION : restaure l'etat exact d'avant migration, y compris la faille.
-- A n'utiliser qu'en cas de regression bloquante confirmee.
-- ============================================================================

BEGIN;

GRANT EXECUTE ON FUNCTION public.enregistrer_passage_fidelite(uuid, varchar, text, varchar, boolean, integer) TO anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.ajuster_tampons_manuel(uuid, integer, text) TO anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.annuler_passage_fidelite(uuid) TO anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirmer_recompense_remise(uuid) TO anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.mettre_a_jour_programme_fidelite(uuid, integer, text, boolean, text) TO anon, PUBLIC;

ALTER FUNCTION public.ajuster_tampons_manuel(uuid, integer, text) RESET search_path;
ALTER FUNCTION public.annuler_passage_fidelite(uuid) RESET search_path;
ALTER FUNCTION public.confirmer_recompense_remise(uuid) RESET search_path;
ALTER FUNCTION public.mettre_a_jour_programme_fidelite(uuid, integer, text, boolean, text) RESET search_path;

-- enregistrer_passage_fidelite : repose la version sans garde-fou 0 ni search_path
-- (corps identique a la version pre-audit ; voir git show 3fb56fe pour reference
-- si cette fonction n'est pas versionnee ailleurs dans sql/)
-- Par securite, repasser par CREATE OR REPLACE avec le corps d'avant migration
-- n'est pas reproduit ici in extenso : restaurer depuis une sauvegarde pg_dump
-- prise juste avant application, ou depuis le CREATE OR REPLACE de
-- fix_audit_C3_fidelite_ownership.sql en retirant manuellement le bloc
-- "Garde-fou 0" et la clause SET search_path = public.

COMMIT;
