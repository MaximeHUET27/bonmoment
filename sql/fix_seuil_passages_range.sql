-- ═══════════════════════════════════════════════════════════════════════════
-- PATCH : Seuil de passages étendu de 1 à 1000 (au lieu de 3 à 50)
-- À exécuter manuellement dans Supabase SQL Editor
-- Idempotent : DROP CONSTRAINT IF EXISTS + CREATE OR REPLACE FUNCTION
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Nouvelle CHECK constraint sur programmes_fidelite.seuil_passages
ALTER TABLE programmes_fidelite
  DROP CONSTRAINT IF EXISTS programmes_fidelite_seuil_passages_check;

ALTER TABLE programmes_fidelite
  ADD CONSTRAINT programmes_fidelite_seuil_passages_check
  CHECK (seuil_passages BETWEEN 1 AND 1000);

-- 2. RPC mettre_a_jour_programme_fidelite : validation 1–1000
CREATE OR REPLACE FUNCTION mettre_a_jour_programme_fidelite(
  p_commerce_id            UUID,
  p_seuil_passages         INTEGER,
  p_description_recompense TEXT,
  p_actif                  BOOLEAN,
  p_regle_tampons          TEXT DEFAULT NULL
)
RETURNS TABLE(
  success                BOOLEAN,
  message                TEXT,
  recompenses_debloquees INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id         UUID;
  v_ancien_seuil     INTEGER;
  v_recompenses_auto INTEGER := 0;
BEGIN
  SELECT owner_id INTO v_owner_id FROM commerces WHERE id = p_commerce_id;
  IF v_owner_id IS DISTINCT FROM auth.uid() THEN
    RETURN QUERY SELECT FALSE, 'Non autorisé'::TEXT, 0; RETURN;
  END IF;

  IF p_seuil_passages < 1 OR p_seuil_passages > 1000 THEN
    RETURN QUERY SELECT FALSE, 'Seuil invalide — entre 1 et 1000 passages requis'::TEXT, 0; RETURN;
  END IF;

  SELECT seuil_passages INTO v_ancien_seuil
    FROM programmes_fidelite WHERE commerce_id = p_commerce_id;

  INSERT INTO programmes_fidelite
    (commerce_id, seuil_passages, description_recompense, regle_tampons, actif)
    VALUES (p_commerce_id, p_seuil_passages, p_description_recompense, p_regle_tampons, p_actif)
    ON CONFLICT (commerce_id) DO UPDATE
      SET seuil_passages         = EXCLUDED.seuil_passages,
          description_recompense = EXCLUDED.description_recompense,
          regle_tampons          = EXCLUDED.regle_tampons,
          actif                  = EXCLUDED.actif,
          updated_at             = NOW();

  -- Option A : baisse de seuil → débloque immédiatement les clients éligibles
  IF v_ancien_seuil IS NOT NULL AND p_seuil_passages < v_ancien_seuil THEN
    WITH debloquables AS (
      SELECT id FROM cartes_fidelite
       WHERE commerce_id = p_commerce_id
         AND nb_passages_depuis_derniere_recompense >= p_seuil_passages
         AND recompense_en_attente = FALSE
    )
    UPDATE cartes_fidelite
       SET nb_passages_depuis_derniere_recompense = 0,
           nb_recompenses_debloquees              = nb_recompenses_debloquees + 1,
           recompense_en_attente                  = TRUE
     WHERE id IN (SELECT id FROM debloquables);

    GET DIAGNOSTICS v_recompenses_auto = ROW_COUNT;
  END IF;

  RETURN QUERY SELECT TRUE,
    'Programme mis à jour'::TEXT ||
    CASE WHEN v_recompenses_auto > 0
      THEN ' (' || v_recompenses_auto::TEXT || ' récompense(s) débloquée(s) immédiatement)'
      ELSE ''
    END,
    v_recompenses_auto;
END;
$$;
