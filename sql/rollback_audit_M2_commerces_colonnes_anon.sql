-- ============================================================================
-- Rollback : M2 — redonne a anon le SELECT sur toutes les colonnes de
-- commerces (etat pre-audit, y compris les colonnes sensibles)
-- ============================================================================

BEGIN;

GRANT SELECT ON public.commerces TO anon;

COMMIT;
