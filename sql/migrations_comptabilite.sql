-- ============================================================
-- Module Comptabilité — Migrations SQL
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TABLE charges
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS charges (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date              DATE NOT NULL,
  fournisseur       TEXT NOT NULL,
  description       TEXT,
  montant_ht        NUMERIC(10,2) NOT NULL,
  taux_tva          NUMERIC(4,2) DEFAULT 20.00,
  montant_tva       NUMERIC(10,2) GENERATED ALWAYS AS (montant_ht * taux_tva / 100) STORED,
  montant_ttc       NUMERIC(10,2) GENERATED ALWAYS AS (montant_ht * (1 + taux_tva / 100)) STORED,
  categorie         TEXT NOT NULL CHECK (categorie IN ('hebergement','services','materiel','deplacements','marketing','juridique','autres')),
  autoliquidation   BOOLEAN DEFAULT false,
  justificatif_url  TEXT,
  recurrente        BOOLEAN DEFAULT false,
  periodicite       TEXT CHECK (periodicite IN ('mensuelle', null)),
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_charges" ON charges FOR SELECT
  USING (auth.jwt()->>'email' = 'bonmomentapp@gmail.com');
CREATE POLICY "admin_insert_charges" ON charges FOR INSERT
  WITH CHECK (auth.jwt()->>'email' = 'bonmomentapp@gmail.com');
CREATE POLICY "admin_update_charges" ON charges FOR UPDATE
  USING (auth.jwt()->>'email' = 'bonmomentapp@gmail.com');
CREATE POLICY "admin_delete_charges" ON charges FOR DELETE
  USING (auth.jwt()->>'email' = 'bonmomentapp@gmail.com');


-- ────────────────────────────────────────────────────────────
-- 2. TABLE parametres_comptables
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parametres_comptables (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regime                TEXT DEFAULT 'micro' CHECK (regime IN ('micro','sas')),
  periodicite_tva       TEXT DEFAULT 'trimestrielle' CHECK (periodicite_tva IN ('mensuelle','trimestrielle')),
  ec_nom                TEXT,
  ec_email              TEXT,
  ec_tel                TEXT,
  siret                 TEXT,
  num_tva               TEXT,
  date_cloture          TEXT DEFAULT '31/12',
  seuil_micro           NUMERIC DEFAULT 77700,
  seuil_franchise_tva   NUMERIC DEFAULT 36800,
  created_at            TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE parametres_comptables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_params" ON parametres_comptables FOR SELECT
  USING (auth.jwt()->>'email' = 'bonmomentapp@gmail.com');
CREATE POLICY "admin_insert_params" ON parametres_comptables FOR INSERT
  WITH CHECK (auth.jwt()->>'email' = 'bonmomentapp@gmail.com');
CREATE POLICY "admin_update_params" ON parametres_comptables FOR UPDATE
  USING (auth.jwt()->>'email' = 'bonmomentapp@gmail.com');
CREATE POLICY "admin_delete_params" ON parametres_comptables FOR DELETE
  USING (auth.jwt()->>'email' = 'bonmomentapp@gmail.com');

-- Ligne par défaut
INSERT INTO parametres_comptables (regime, periodicite_tva, date_cloture, seuil_micro, seuil_franchise_tva)
SELECT 'micro', 'trimestrielle', '31/12', 77700, 36800
WHERE NOT EXISTS (SELECT 1 FROM parametres_comptables);


-- ────────────────────────────────────────────────────────────
-- 3. TABLE recettes (cache paiements Stripe)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recettes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_id   TEXT UNIQUE NOT NULL,
  stripe_invoice_id   TEXT,
  date                DATE NOT NULL,
  commerce_id         UUID REFERENCES commerces(id),
  commerce_nom        TEXT NOT NULL,
  montant_ht          NUMERIC(10,2) NOT NULL,
  taux_tva            NUMERIC(4,2) DEFAULT 20.00,
  montant_tva         NUMERIC(10,2) GENERATED ALWAYS AS (montant_ht * taux_tva / 100) STORED,
  montant_ttc         NUMERIC(10,2) GENERATED ALWAYS AS (montant_ht * (1 + taux_tva / 100)) STORED,
  mode_paiement       TEXT DEFAULT 'carte',
  statut              TEXT DEFAULT 'payee' CHECK (statut IN ('payee','remboursee','echouee')),
  remise_parrainage   NUMERIC(10,2) DEFAULT 0,
  numero_facture      TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE recettes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_recettes" ON recettes FOR SELECT
  USING (auth.jwt()->>'email' = 'bonmomentapp@gmail.com');
CREATE POLICY "admin_insert_recettes" ON recettes FOR INSERT
  WITH CHECK (auth.jwt()->>'email' = 'bonmomentapp@gmail.com');
CREATE POLICY "admin_update_recettes" ON recettes FOR UPDATE
  USING (auth.jwt()->>'email' = 'bonmomentapp@gmail.com');
CREATE POLICY "admin_delete_recettes" ON recettes FOR DELETE
  USING (auth.jwt()->>'email' = 'bonmomentapp@gmail.com');


-- ────────────────────────────────────────────────────────────
-- 4. Supabase Storage — bucket "justificatifs"
-- À créer manuellement dans Supabase Dashboard > Storage :
--   - Nom : justificatifs
--   - Visibilité : privé (Private)
--   - Taille max : 5 MB
--   - Types autorisés : application/pdf, image/jpeg, image/png
--
-- Policies à créer :
--   - SELECT : auth.jwt()->>'email' = 'bonmomentapp@gmail.com'
--   - INSERT : auth.jwt()->>'email' = 'bonmomentapp@gmail.com'
--   - DELETE : auth.jwt()->>'email' = 'bonmomentapp@gmail.com'
-- ────────────────────────────────────────────────────────────
