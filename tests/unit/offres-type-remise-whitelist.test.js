import { describe, it, expect } from 'vitest'
import { TYPES_REMISE_AUTORISES } from '../../lib/constants.js'

/* ── Whitelist type_remise — alignement CHECK constraint BDD ────────────── */

describe('TYPES_REMISE_AUTORISES — alignement avec CHECK constraint offres_type_remise_check', () => {
  it('contient exactement 11 valeurs', () => {
    expect(TYPES_REMISE_AUTORISES).toHaveLength(11)
  })

  it('contient anti_gaspi (valeur ajoutée en migration corrective)', () => {
    expect(TYPES_REMISE_AUTORISES).toContain('anti_gaspi')
  })

  it('contient les 10 valeurs historiques du CHECK constraint prod', () => {
    const historiques = [
      'pourcentage', 'montant_fixe', 'montant', 'cadeau',
      'produit_offert', 'service_offert', 'concours', 'atelier',
      'fidelite', 'offert',
    ]
    for (const v of historiques) {
      expect(TYPES_REMISE_AUTORISES, `valeur manquante : ${v}`).toContain(v)
    }
  })

  it('est un tableau de chaînes (pas d\'objet ni d\'autre type)', () => {
    expect(Array.isArray(TYPES_REMISE_AUTORISES)).toBe(true)
    for (const v of TYPES_REMISE_AUTORISES) {
      expect(typeof v).toBe('string')
    }
  })

  it('ne contient pas de doublons', () => {
    const unique = new Set(TYPES_REMISE_AUTORISES)
    expect(unique.size).toBe(TYPES_REMISE_AUTORISES.length)
  })
})
