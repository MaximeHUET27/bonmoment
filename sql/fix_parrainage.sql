-- ============================================================
-- BONMOMENT — Migration parrainage v2
-- Corrige les RLS codes_parrainage + colonnes manquantes
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- ── 1. Colonnes manquantes sur codes_parrainage ──────────────
ALTER TABLE public.codes_parrainage
  ADD COLUMN IF NOT EXISTS utilise_at TIMESTAMPTZ;

-- ── 2. Colonne de tracking sur commerces ─────────────────────
-- Évite d'appliquer deux fois la remise parrain
ALTER TABLE public.commerces
  ADD COLUMN IF NOT EXISTS parrainage_parrain_recompense BOOLEAN NOT NULL DEFAULT false;

-- ── 3. Supprimer les anciennes politiques RLS incorrectes ─────
-- Problème : elles utilisaient `created_by` qui n'est jamais populé par le code
DROP POLICY IF EXISTS "codes_parrainage_select_owner"           ON public.codes_parrainage;
DROP POLICY IF EXISTS "codes_parrainage_insert_authenticated"   ON public.codes_parrainage;
DROP POLICY IF EXISTS "codes_parrainage_update_authenticated"   ON public.codes_parrainage;

-- ── 4. Nouvelles politiques RLS correctes ────────────────────

-- SELECT : tout utilisateur connecté peut lire
--   → nécessaire pour valider un code lors de l'inscription filleul
--   → le dashboard filtre lui-même sur commerce_id
CREATE POLICY "codes_parrainage_select_authenticated"
  ON public.codes_parrainage FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT : uniquement le propriétaire du commerce concerné
CREATE POLICY "codes_parrainage_insert_owner"
  ON public.codes_parrainage FOR INSERT
  WITH CHECK (
    commerce_id IN (
      SELECT id FROM public.commerces WHERE owner_id = auth.uid()
    )
  );

-- UPDATE : tout utilisateur connecté
--   → nécessaire pour que le filleul marque le code comme utilisé à l'inscription
CREATE POLICY "codes_parrainage_update_authenticated"
  ON public.codes_parrainage FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ── 5. Index pour les lookups fréquents ──────────────────────
CREATE INDEX IF NOT EXISTS idx_codes_parrainage_code
  ON public.codes_parrainage (code);

CREATE INDEX IF NOT EXISTS idx_codes_parrainage_commerce_id
  ON public.codes_parrainage (commerce_id);

CREATE INDEX IF NOT EXISTS idx_codes_parrainage_created_at
  ON public.codes_parrainage (created_at);

-- ── Vérification ─────────────────────────────────────────────
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'codes_parrainage'
ORDER BY cmd, policyname;
