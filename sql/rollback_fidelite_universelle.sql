-- ============================================================================
-- ROLLBACK : CARTE FIDÉLITÉ UNIVERSELLE
-- À exécuter dans Supabase SQL Editor si besoin de revenir en arrière
--
-- Ordre d'exécution obligatoire :
--   1. Ce fichier dans Supabase SQL Editor
--   2. git revert <hash_commit_fidelite> (pour retirer le code JS)
--
-- Durée estimée : < 10 secondes
-- Données perdues : OUI — toutes les cartes, passages et programmes fidélité
-- ============================================================================

BEGIN;

-- ── Fonctions (CASCADE supprime les dépendances éventuelles) ─────────────────
DROP FUNCTION IF EXISTS enregistrer_passage_fidelite(UUID, VARCHAR, TEXT, VARCHAR, BOOLEAN, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS annuler_passage_fidelite(UUID) CASCADE;
DROP FUNCTION IF EXISTS ajuster_tampons_manuel(UUID, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS confirmer_recompense_remise(UUID) CASCADE;
DROP FUNCTION IF EXISTS activer_carte_fidelite_client(TEXT) CASCADE;
DROP FUNCTION IF EXISTS desactiver_fidelite_client() CASCADE;
DROP FUNCTION IF EXISTS modifier_telephone_client(TEXT) CASCADE;
DROP FUNCTION IF EXISTS mettre_a_jour_programme_fidelite(UUID, INTEGER, TEXT, BOOLEAN, TEXT) CASCADE;
DROP FUNCTION IF EXISTS peut_utiliser_fidelite(UUID) CASCADE;
DROP FUNCTION IF EXISTS check_rate_limit_fidelite(UUID) CASCADE;

-- ── Vue ───────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS vue_base_client_fidelite CASCADE;

-- ── Tables (ordre inverse des FK) ────────────────────────────────────────────
DROP TABLE IF EXISTS fidelite_flags_antifraude CASCADE;
DROP TABLE IF EXISTS passages_fidelite CASCADE;
DROP TABLE IF EXISTS cartes_fidelite CASCADE;
DROP TABLE IF EXISTS programmes_fidelite CASCADE;
DROP TABLE IF EXISTS users_light CASCADE;

-- ── Colonne telephone sur users ───────────────────────────────────────────────
DROP INDEX IF EXISTS idx_users_telephone_unique;
ALTER TABLE users DROP COLUMN IF EXISTS telephone;

COMMIT;
