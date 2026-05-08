-- ============================================================================
-- MIGRATION : Module Mairie / Association — LOT 1
-- Date : 2026-05-08
-- Auteur : Claude Code via prompt Maxime
-- ============================================================================
-- PRINCIPE : migration 100% ADDITIVE. Aucune colonne ni table existante
-- n'est modifiée. Si elle est rollback, l'application revient à un état
-- strictement identique à l'état pré-migration.
-- ============================================================================
-- À exécuter manuellement dans Supabase SQL Editor.
-- Avant exécution : faire une sauvegarde Supabase (Settings → Database → Backups).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 3.1 Étendre la liste des catégories BONMOMENT pour accepter 'mairie_asso'
-- ----------------------------------------------------------------------------
-- ANALYSE DU SCHÉMA RÉEL :
-- La colonne commerces.categorie_bonmoment est de type TEXT brut, sans CHECK
-- constraint ni ENUM PostgreSQL (vérifié dans supabase/schema.sql).
-- La validation est uniquement applicative (côté Next.js).
-- → Aucune modification SQL nécessaire pour autoriser la valeur 'mairie_asso'.
-- → La colonne accepte déjà n'importe quelle valeur TEXT.
-- → Le rollback de cette contrainte est donc trivial (rien à défaire).
-- Ce bloc est conservé comme documentation explicite de cette décision.

-- (Aucun DDL requis pour la contrainte categorie_bonmoment)

-- ----------------------------------------------------------------------------
-- 3.2 Ajouter logo_url et affiche_logo_mairie_asso_id sur la table commerces
-- ----------------------------------------------------------------------------
-- logo_url : logo uploadé par le compte mairie_asso (NULL pour les commerces normaux)
-- affiche_logo_mairie_asso_id : choix du commerçant pour son affiche vitrine PDF
--   - NULL et 0 asso : aucun logo sur l'affiche (cas actuel inchangé)
--   - NULL et 1 asso : logo de cette asso par défaut
--   - NULL et 2+ assos : aucun logo (le commerçant n'a pas choisi)
--   - Renseigné : logo de l'asso choisie

ALTER TABLE commerces
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS affiche_logo_mairie_asso_id UUID REFERENCES commerces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_commerces_affiche_logo
  ON commerces(affiche_logo_mairie_asso_id)
  WHERE affiche_logo_mairie_asso_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3.3 Ajouter avec_bon sur la table offres (DEFAULT TRUE → ne casse rien)
-- ----------------------------------------------------------------------------
-- avec_bon = TRUE : comportement actuel inchangé (toutes les offres existantes)
-- avec_bon = FALSE : offre d'information (uniquement pour comptes mairie_asso)

ALTER TABLE offres
  ADD COLUMN IF NOT EXISTS avec_bon BOOLEAN NOT NULL DEFAULT TRUE;

-- ----------------------------------------------------------------------------
-- 3.4 Créer la table mairie_asso_membres (lien N-N validé)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mairie_asso_membres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mairie_asso_id UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  commerce_id UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  statut TEXT NOT NULL DEFAULT 'pending'
    CHECK (statut IN ('pending', 'accepted', 'declined', 'removed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  removed_at TIMESTAMP WITH TIME ZONE,
  removed_by TEXT CHECK (removed_by IN ('mairie_asso', 'commerce', NULL)),
  CONSTRAINT pas_de_self_link CHECK (mairie_asso_id <> commerce_id),
  CONSTRAINT lien_unique UNIQUE (mairie_asso_id, commerce_id)
);

CREATE INDEX IF NOT EXISTS idx_mairie_asso_membres_asso
  ON mairie_asso_membres(mairie_asso_id);
CREATE INDEX IF NOT EXISTS idx_mairie_asso_membres_commerce
  ON mairie_asso_membres(commerce_id);
CREATE INDEX IF NOT EXISTS idx_mairie_asso_membres_statut
  ON mairie_asso_membres(statut)
  WHERE statut IN ('pending', 'accepted');

-- ----------------------------------------------------------------------------
-- 3.5 Trigger de cohérence : un mairie_asso ne peut pas être membre,
--     un commerce ne peut pas être référencé comme mairie_asso
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION check_mairie_asso_validity()
RETURNS TRIGGER AS $$
BEGIN
  -- Le mairie_asso_id doit pointer vers un compte de catégorie 'mairie_asso'
  IF NOT EXISTS (
    SELECT 1 FROM commerces
    WHERE id = NEW.mairie_asso_id
      AND categorie_bonmoment = 'mairie_asso'
  ) THEN
    RAISE EXCEPTION 'mairie_asso_id (%) doit référencer un commerce de catégorie mairie_asso', NEW.mairie_asso_id;
  END IF;

  -- Le commerce_id ne doit PAS être de catégorie 'mairie_asso'
  IF EXISTS (
    SELECT 1 FROM commerces
    WHERE id = NEW.commerce_id
      AND categorie_bonmoment = 'mairie_asso'
  ) THEN
    RAISE EXCEPTION 'commerce_id (%) ne peut pas être un compte mairie_asso', NEW.commerce_id;
  END IF;

  -- Cohérence accepted_at
  IF NEW.statut = 'accepted' AND NEW.accepted_at IS NULL THEN
    NEW.accepted_at := NOW();
  END IF;

  -- Cohérence removed_at + removed_by
  IF NEW.statut = 'removed' AND NEW.removed_at IS NULL THEN
    NEW.removed_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_mairie_asso_validity ON mairie_asso_membres;
CREATE TRIGGER trigger_check_mairie_asso_validity
  BEFORE INSERT OR UPDATE ON mairie_asso_membres
  FOR EACH ROW EXECUTE FUNCTION check_mairie_asso_validity();

-- ----------------------------------------------------------------------------
-- 3.6 Trigger : empêcher qu'un commerce déjà membre passe en mairie_asso
--     (évite les inversions de rôle qui casseraient les liens)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION prevent_categorie_change_if_member()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.categorie_bonmoment IS DISTINCT FROM NEW.categorie_bonmoment THEN
    -- Si on tente de passer un commerce membre en mairie_asso → refus
    IF NEW.categorie_bonmoment = 'mairie_asso' AND EXISTS (
      SELECT 1 FROM mairie_asso_membres
      WHERE commerce_id = NEW.id AND statut IN ('pending', 'accepted')
    ) THEN
      RAISE EXCEPTION 'Ce commerce est déjà membre d''une mairie/asso, impossible de changer sa catégorie en mairie_asso';
    END IF;

    -- Si on tente de passer un mairie_asso ayant des membres en autre catégorie → refus
    IF OLD.categorie_bonmoment = 'mairie_asso' AND EXISTS (
      SELECT 1 FROM mairie_asso_membres
      WHERE mairie_asso_id = NEW.id AND statut IN ('pending', 'accepted')
    ) THEN
      RAISE EXCEPTION 'Cette mairie/asso a des membres actifs, impossible de changer sa catégorie';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_categorie_change ON commerces;
CREATE TRIGGER trigger_prevent_categorie_change
  BEFORE UPDATE OF categorie_bonmoment ON commerces
  FOR EACH ROW EXECUTE FUNCTION prevent_categorie_change_if_member();

-- ----------------------------------------------------------------------------
-- 3.7 Activer RLS sur mairie_asso_membres
-- ----------------------------------------------------------------------------

ALTER TABLE mairie_asso_membres ENABLE ROW LEVEL SECURITY;

-- Lecture : la mairie/asso voit ses propres lignes
CREATE POLICY "mairie_asso_voit_ses_membres" ON mairie_asso_membres
  FOR SELECT
  USING (
    mairie_asso_id IN (
      SELECT id FROM commerces WHERE owner_id = auth.uid()
    )
  );

-- Lecture : le commerce voit ses propres invitations/adhésions
CREATE POLICY "commerce_voit_ses_invitations" ON mairie_asso_membres
  FOR SELECT
  USING (
    commerce_id IN (
      SELECT id FROM commerces WHERE owner_id = auth.uid()
    )
  );

-- Insert : seul le compte mairie_asso peut créer une invitation
CREATE POLICY "mairie_asso_cree_invitation" ON mairie_asso_membres
  FOR INSERT
  WITH CHECK (
    mairie_asso_id IN (
      SELECT id FROM commerces
      WHERE owner_id = auth.uid()
        AND categorie_bonmoment = 'mairie_asso'
    )
  );

-- Update : le commerce peut accepter/refuser/quitter, la mairie/asso peut retirer
CREATE POLICY "gestion_adhesion" ON mairie_asso_membres
  FOR UPDATE
  USING (
    commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid())
    OR
    mairie_asso_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid())
  );

-- Pas de DELETE policy : on garde l'historique (statut = 'removed' à la place)

-- ----------------------------------------------------------------------------
-- 3.8 Commentaires sur les colonnes et tables (documentation in-place)
-- ----------------------------------------------------------------------------

COMMENT ON COLUMN commerces.logo_url IS
  'Logo personnalisé uploadé par le compte mairie_asso. NULL pour les commerces normaux.';
COMMENT ON COLUMN commerces.affiche_logo_mairie_asso_id IS
  'Référence vers le mairie_asso dont le logo doit apparaître sur l''affiche vitrine PDF du commerçant. NULL = pas de logo (ou choix automatique si une seule asso).';
COMMENT ON COLUMN offres.avec_bon IS
  'TRUE = offre classique avec réservation de bon. FALSE = offre d''information (réservé aux comptes mairie_asso).';
COMMENT ON TABLE mairie_asso_membres IS
  'Liens entre comptes mairie_asso et commerces. Un commerce peut être membre de plusieurs mairie_asso. Statuts : pending → accepted/declined → removed.';

COMMIT;

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
-- Pour vérifier le bon déroulement, exécuter ensuite :
--   sql/test_post_migration_mairie_asso.sql
--
-- Pour rollback complet :
--   sql/rollback_mairie_asso.sql
-- ============================================================================
