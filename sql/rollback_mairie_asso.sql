-- ============================================================================
-- ROLLBACK : Module Mairie / Association — LOT 1
-- ============================================================================
-- ATTENTION : ce script SUPPRIME toutes les données du module mairie_asso.
-- Toutes les invitations et adhésions seront perdues.
-- Les comptes commerces de catégorie 'mairie_asso' resteront mais leur
-- catégorie devra être changée manuellement (ou ils deviendront inaccessibles).
-- ============================================================================
-- Préférer si possible le rollback Niveau 0 (désactivation feature flag).
-- ============================================================================

BEGIN;

-- 1. Supprimer les triggers
DROP TRIGGER IF EXISTS trigger_check_mairie_asso_validity ON mairie_asso_membres;
DROP TRIGGER IF EXISTS trigger_prevent_categorie_change ON commerces;
DROP FUNCTION IF EXISTS check_mairie_asso_validity();
DROP FUNCTION IF EXISTS prevent_categorie_change_if_member();

-- 2. Supprimer la table des membres (et toutes ses policies/index par cascade)
DROP TABLE IF EXISTS mairie_asso_membres;

-- 3. Supprimer les colonnes ajoutées
ALTER TABLE commerces DROP COLUMN IF EXISTS affiche_logo_mairie_asso_id;
ALTER TABLE commerces DROP COLUMN IF EXISTS logo_url;
ALTER TABLE offres DROP COLUMN IF EXISTS avec_bon;

-- 4. Note sur la contrainte categorie_bonmoment
-- ============================================================================
-- ANALYSE : categorie_bonmoment est de type TEXT brut, sans CHECK constraint
-- ni ENUM PostgreSQL (vérifié dans supabase/schema.sql).
-- → Aucune contrainte n'a été ajoutée dans la migration → rien à rollback ici.
-- → Les enregistrements existants avec categorie_bonmoment = 'mairie_asso'
--   ne seront plus affichés côté client car :
--     a) Le feature flag sera désactivé (Niveau 0)
--     b) Ou le code source sera revert (Niveau 2)
-- → Si des comptes mairie_asso ont été créés et que l'on veut les neutraliser :
--   UPDATE commerces SET categorie_bonmoment = 'autres'
--   WHERE categorie_bonmoment = 'mairie_asso';
--   (à exécuter manuellement si nécessaire, APRÈS ce rollback)
-- ============================================================================

COMMIT;

-- ============================================================================
-- FIN DU ROLLBACK
-- ============================================================================
