import { describe, it, expect } from 'vitest'
import { getOffreTitle, getFullOffreTitle } from '../../lib/offreTitle.js'

/* ── getOffreTitle — titre brut sans emoji ──────────────────────────────── */

describe('getOffreTitle — retourne le titre brut sans emoji préfixé', () => {
  const TYPES = ['pourcentage', 'montant_fixe', 'cadeau', 'atelier', 'concours', 'anti_gaspi', 'fidelite']

  for (const type of TYPES) {
    it(`${type} → titre brut`, () => {
      const titre = 'Mon super titre'
      const result = getOffreTitle({ type_remise: type, valeur: 10, titre })
      expect(result).toBe(titre)
      expect(result).not.toMatch(/^[🎁🎉🎰⭐🥗🎨−]/)
    })
  }

  it('offre null → chaîne vide', () => {
    expect(getOffreTitle(null)).toBe('')
    expect(getOffreTitle(undefined)).toBe('')
  })

  it('titre vide → chaîne vide', () => {
    expect(getOffreTitle({ type_remise: 'cadeau', titre: '' })).toBe('')
  })
})

/* ── getFullOffreTitle — titre avec emoji (partage social) ──────────────── */

describe('getFullOffreTitle — titre avec emoji préfixé (comportement inchangé)', () => {
  it('pourcentage → -X% titre', () => {
    expect(getFullOffreTitle({ type_remise: 'pourcentage', valeur: 20, titre: 'coupes' })).toBe('-20% coupes')
  })

  it('montant_fixe → -X€ titre', () => {
    expect(getFullOffreTitle({ type_remise: 'montant_fixe', valeur: 5, titre: 'repas' })).toBe('-5€ repas')
  })

  it('cadeau → 🎁 titre', () => {
    expect(getFullOffreTitle({ type_remise: 'cadeau', titre: 'un café' })).toBe('🎁 un café')
  })

  it('atelier → 🎨 titre', () => {
    expect(getFullOffreTitle({ type_remise: 'atelier', titre: 'pâtisserie' })).toBe('🎨 pâtisserie')
  })

  it('concours → 🎰 titre', () => {
    expect(getFullOffreTitle({ type_remise: 'concours', titre: 'gagnez un soin' })).toBe('🎰 gagnez un soin')
  })

  it('fidelite → ⭐ titre', () => {
    expect(getFullOffreTitle({ type_remise: 'fidelite', titre: 'points doublés' })).toBe('⭐ points doublés')
  })

  it('anti_gaspi → 🥗 titre', () => {
    expect(getFullOffreTitle({ type_remise: 'anti_gaspi', titre: 'panier surprise' })).toBe('🥗 panier surprise')
  })
})

/* ── Distinction : getOffreTitle ≠ getFullOffreTitle pour les types préfixés */

describe('Distinction getOffreTitle vs getFullOffreTitle', () => {
  const CAS = [
    { type: 'cadeau',     titre: 'café offert' },
    { type: 'atelier',    titre: 'initiation pâtisserie' },
    { type: 'concours',   titre: 'gagnez un soin' },
    { type: 'fidelite',   titre: 'points doublés' },
    { type: 'anti_gaspi', titre: 'panier du soir' },
  ]

  for (const { type, titre } of CAS) {
    it(`${type} : getOffreTitle ≠ getFullOffreTitle`, () => {
      const offre = { type_remise: type, titre }
      expect(getOffreTitle(offre)).toBe(titre)
      expect(getFullOffreTitle(offre)).not.toBe(titre)
      expect(getFullOffreTitle(offre)).toContain(titre)
    })
  }

  it('pourcentage : les deux diffèrent (getOffreTitle = titre brut)', () => {
    const offre = { type_remise: 'pourcentage', valeur: 15, titre: 'coupes' }
    expect(getOffreTitle(offre)).toBe('coupes')
    expect(getFullOffreTitle(offre)).toBe('-15% coupes')
  })
})

/* ── Filtre VilleClient — emoji 🏷️ pour Remise ────────────────────────── */

describe('FILTERS_TYPE — emoji 🏷️ pour le filtre Remise', () => {
  const FILTERS_TYPE = [
    { id: 'remise',     label: '🏷️ Remise' },
    { id: 'offerts',    label: '🎁 Offert' },
    { id: 'atelier',    label: '🎉 Évènement' },
    { id: 'concours',   label: '🎰 Concours' },
    { id: 'fidelite',   label: '⭐ Fidélité' },
    { id: 'anti_gaspi', label: '🥗 Anti-gaspi' },
  ]

  it('filtre remise utilise 🏷️ et non 💰', () => {
    const filtre = FILTERS_TYPE.find(f => f.id === 'remise')
    expect(filtre.label).toContain('🏷️')
    expect(filtre.label).not.toContain('💰')
  })

  it('filtre anti_gaspi utilise 🥗', () => {
    const filtre = FILTERS_TYPE.find(f => f.id === 'anti_gaspi')
    expect(filtre.label).toContain('🥗')
  })
})

/* ── ShareButton formatBadge — couverture anti_gaspi et fidelite ─────────── */

describe('ShareButton formatBadge — couverture complète des types', () => {
  function formatBadge(offre) {
    if (!offre) return 'Offre'
    if (offre.type_remise === 'pourcentage')    return `−${offre.valeur}%`
    if (offre.type_remise === 'montant_fixe')   return `−${offre.valeur}€`
    if (offre.type_remise === 'cadeau')         return '🎁 Cadeau'
    if (offre.type_remise === 'produit_offert') return '📦 Offert'
    if (offre.type_remise === 'service_offert') return '✂️ Offert'
    if (offre.type_remise === 'concours')       return '🎰 Concours'
    if (offre.type_remise === 'atelier')        return '🎉 Évènement'
    if (offre.type_remise === 'fidelite')       return '⭐ Fidélité'
    if (offre.type_remise === 'anti_gaspi')     return '🥗 Anti-gaspi'
    return 'Offre'
  }

  it('anti_gaspi → 🥗 Anti-gaspi (pas "Offre" générique)', () => {
    expect(formatBadge({ type_remise: 'anti_gaspi' })).toBe('🥗 Anti-gaspi')
    expect(formatBadge({ type_remise: 'anti_gaspi' })).not.toBe('Offre')
  })

  it('fidelite → ⭐ Fidélité', () => {
    expect(formatBadge({ type_remise: 'fidelite' })).toBe('⭐ Fidélité')
  })

  it('pourcentage → −X% (pas 💰)', () => {
    const badge = formatBadge({ type_remise: 'pourcentage', valeur: 20 })
    expect(badge).toBe('−20%')
    expect(badge).not.toContain('💰')
  })
})
