import { describe, it, expect } from 'vitest'

/* ── PLACEHOLDERS_DESCRIPTION centralisé ────────────────────────────────── */

const PLACEHOLDERS_DESCRIPTION = {
  pourcentage:  "Ex : Sur toutes les coupes aujourd'hui",
  montant_fixe: 'Ex : Sur ton repas du soir',
  cadeau:       "Ex : Un croissant à l'achat d'une baguette",
  concours:     "Ex : Gagnez un soin complet d'une valeur de 50€",
  atelier:      'Ex : Initiation à la pâtisserie — places limitées',
  fidelite:     'Ex : vos points doublés',
  anti_gaspi:   'Ex : 4 viennoiseries pour 2€',
}

const TYPES_GRILLE = ['cadeau', 'atelier', 'concours', 'anti_gaspi', 'fidelite']
const TYPES_REMISE = ['pourcentage', 'montant_fixe']

/* ── Entrée par type de grille ───────────────────────────────────────────── */

describe('PLACEHOLDERS_DESCRIPTION — entrée pour chaque type de la grille', () => {
  for (const type of TYPES_GRILLE) {
    it(`${type} → placeholder défini et non vide`, () => {
      expect(PLACEHOLDERS_DESCRIPTION[type]).toBeDefined()
      expect(PLACEHOLDERS_DESCRIPTION[type]).not.toBe('')
    })
  }

  for (const type of TYPES_REMISE) {
    it(`${type} → placeholder défini et non vide`, () => {
      expect(PLACEHOLDERS_DESCRIPTION[type]).toBeDefined()
      expect(PLACEHOLDERS_DESCRIPTION[type]).not.toBe('')
    })
  }
})

/* ── Placeholder Anti-gaspi exact ────────────────────────────────────────── */

describe('PLACEHOLDERS_DESCRIPTION.anti_gaspi', () => {
  it('vaut exactement "Ex : 4 viennoiseries pour 2€"', () => {
    expect(PLACEHOLDERS_DESCRIPTION.anti_gaspi).toBe('Ex : 4 viennoiseries pour 2€')
  })

  it('ne contient plus "invendus du jour" (ancien placeholder remplacé)', () => {
    expect(PLACEHOLDERS_DESCRIPTION.anti_gaspi).not.toContain('invendus du jour')
  })
})

/* ── Aucune valeur ne contient l'ancien placeholder anti_gaspi ───────────── */

describe('Aucune valeur PLACEHOLDERS_DESCRIPTION ne contient "invendus du jour"', () => {
  it('toutes les entrées sont exemptes de l\'ancien placeholder', () => {
    for (const [type, placeholder] of Object.entries(PLACEHOLDERS_DESCRIPTION)) {
      expect(placeholder, `${type} contient "invendus du jour"`).not.toContain('invendus du jour')
    }
  })
})

/* ── Switch %/€ → placeholder dynamique via typeRemise ──────────────────── */

describe('Switch %/€ — le placeholder change selon typeRemise', () => {
  it('typeRemise=pourcentage → placeholder spécifique au %', () => {
    const p = PLACEHOLDERS_DESCRIPTION['pourcentage'] || ''
    expect(p).not.toBe('')
    expect(p).toBe("Ex : Sur toutes les coupes aujourd'hui")
  })

  it('typeRemise=montant_fixe → placeholder spécifique au €', () => {
    const p = PLACEHOLDERS_DESCRIPTION['montant_fixe'] || ''
    expect(p).not.toBe('')
    expect(p).toBe('Ex : Sur ton repas du soir')
  })

  it('les deux placeholders Remise sont différents', () => {
    expect(PLACEHOLDERS_DESCRIPTION.pourcentage).not.toBe(PLACEHOLDERS_DESCRIPTION.montant_fixe)
  })
})

/* ── Format éditorial "Ex : ..." ────────────────────────────────────────── */

describe('Format éditorial — tous les placeholders démarrent par "Ex : "', () => {
  it('toutes les entrées non vides respectent le format "Ex : "', () => {
    for (const [type, placeholder] of Object.entries(PLACEHOLDERS_DESCRIPTION)) {
      if (placeholder) {
        expect(placeholder, `${type} ne commence pas par "Ex : "`).toMatch(/^Ex : /)
      }
    }
  })
})
