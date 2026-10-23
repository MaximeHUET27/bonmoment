-- ============================================================================
-- Rollback : M3 — retire l'index unique (le code applicatif de
-- valider-bon reste scope sauf si ce fichier est repousse manuellement ;
-- la fonction SQL redevient celle d'avant M3 en reappliquant
-- fix_audit_C3_fidelite_ownership.sql, qui contient la version sans le
-- scope commerce sur code_6)
-- ============================================================================

BEGIN;

DROP INDEX IF EXISTS public.reservations_offre_code_actif_unique;

COMMIT;

-- Pour revenir avant M3 sur enregistrer_passage_fidelite (code_6 non
-- scope), reappliquer le CREATE OR REPLACE de
-- sql/fix_audit_C3_fidelite_ownership.sql (qui garde le garde-fou de
-- propriete C3 mais sans le filtre commerce sur code_6).
