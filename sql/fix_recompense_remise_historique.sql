-- ═══════════════════════════════════════════════════════════════════════════
-- PATCH : Tracer les remises de récompenses dans passages_fidelite
-- À exécuter manuellement dans Supabase SQL Editor
-- Idempotent : DROP CONSTRAINT IF EXISTS + CREATE OR REPLACE FUNCTION
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Étendre la CHECK constraint de passages_fidelite.mode_identification
--    pour accepter la nouvelle valeur 'recompense_remise'
ALTER TABLE passages_fidelite
  DROP CONSTRAINT IF EXISTS passages_fidelite_mode_identification_check;

ALTER TABLE passages_fidelite
  ADD CONSTRAINT passages_fidelite_mode_identification_check
  CHECK (mode_identification IN ('qr', 'code_6', 'telephone', 'manuel', 'recompense_remise'));

-- 2. Modifier confirmer_recompense_remise pour insérer un événement tracé
--    NB : l'INSERT n'a lieu que si le UPDATE a réellement modifié une ligne (FOUND = TRUE)
--    NB : passage_group_id est unique par événement — n'interfère pas avec les tampons
CREATE OR REPLACE FUNCTION confirmer_recompense_remise(p_carte_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE cartes_fidelite
     SET recompense_en_attente = FALSE
   WHERE id = p_carte_id
     AND commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid())
     AND recompense_en_attente = TRUE;

  IF FOUND THEN
    INSERT INTO passages_fidelite (
      carte_fidelite_id,
      mode_identification,
      passage_group_id,
      annule
    ) VALUES (
      p_carte_id,
      'recompense_remise',
      uuid_generate_v4(),
      FALSE
    );
  END IF;

  RETURN FOUND;
END;
$$;
