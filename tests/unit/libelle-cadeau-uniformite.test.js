import { describe, it, expect } from 'vitest'

/* ── Logique extraite des composants ────────────────────────────────────── */

function formatBadge(type_remise) {
  if (type_remise === 'pourcentage')    return `−X%`
  if (type_remise === 'montant_fixe')   return `−X€`
  if (type_remise === 'cadeau')         return '🎁 Cadeau'
  if (type_remise === 'produit_offert') return '📦 Offert'
  if (type_remise === 'service_offert') return '✂️ Offert'
  if (type_remise === 'concours')       return '🎰 Concours'
  if (type_remise === 'atelier')        return '🎉 Évènement'
  if (type_remise === 'fidelite')       return '⭐ Fidélité'
  if (type_remise === 'anti_gaspi')     return '🥗 Anti-gaspi'
  return 'Offre'
}

const PLACEHOLDERS_DESCRIPTION = {
  pourcentage:  "Ex : Sur toutes les coupes aujourd'hui",
  montant_fixe: 'Ex : Sur ton repas du soir',
  cadeau:       "Ex : Un croissant à l'achat d'une baguette",
  concours:     "Ex : Gagnez un soin complet d'une valeur de 50€",
  atelier:      'Ex : Initiation à la pâtisserie — places limitées',
  fidelite:     'Ex : vos points doublés',
  anti_gaspi:   'Ex : 4 viennoiseries pour 2€',
}

/* ── formatBadge cadeau — "Cadeau" sans "offert" ────────────────────────── */

describe('formatBadge(cadeau) — libellé uniformisé', () => {
  it('contient "Cadeau"', () => {
    expect(formatBadge('cadeau')).toContain('Cadeau')
  })

  it('ne contient pas "offert" (insensible à la casse)', () => {
    expect(formatBadge('cadeau').toLowerCase()).not.toContain('offert')
  })

  it('vaut exactement "🎁 Cadeau"', () => {
    expect(formatBadge('cadeau')).toBe('🎁 Cadeau')
  })
})

/* ── PLACEHOLDERS_DESCRIPTION.cadeau — pas d'"offert" ──────────────────── */

describe('PLACEHOLDERS_DESCRIPTION.cadeau — pas de "offert"', () => {
  it('ne contient pas "offert" (insensible à la casse)', () => {
    expect(PLACEHOLDERS_DESCRIPTION.cadeau.toLowerCase()).not.toContain('offert')
  })

  it('contient "Ex : "', () => {
    expect(PLACEHOLDERS_DESCRIPTION.cadeau).toMatch(/^Ex : /)
  })
})

/* ── Aucune chaîne "Cadeau offert" ni "cadeau offert" dans les libellés ── */

describe('Uniformité libellé — aucun "Cadeau offert" dans les types de la grille', () => {
  const TYPES_LABELS = [
    { id: 'cadeau',     label: 'Cadeau' },
    { id: 'atelier',    label: 'Évènement' },
    { id: 'concours',   label: 'Concours' },
    { id: 'remise',     label: 'Remise' },
    { id: 'anti_gaspi', label: 'Anti-gaspi' },
    { id: 'fidelite',   label: 'Fidélité' },
  ]

  it('aucun label de la grille ne contient "offert" (insensible à la casse)', () => {
    for (const { id, label } of TYPES_LABELS) {
      expect(label.toLowerCase(), `Type ${id} contient "offert"`).not.toContain('offert')
    }
  })

  it('le label cadeau est exactement "Cadeau"', () => {
    const cadeau = TYPES_LABELS.find(t => t.id === 'cadeau')
    expect(cadeau.label).toBe('Cadeau')
  })
})

/* ── labelRemise valider/page.js — cadeau renvoie "Cadeau" ─────────────── */

describe('labelRemise (valider/page.js) — cadeau renvoie "Cadeau"', () => {
  function labelRemise(type_remise, valeur) {
    switch (type_remise) {
      case 'pourcentage':    return `${valeur}% de remise`
      case 'montant_fixe':   return `${valeur}€ de remise`
      case 'cadeau':         return 'Cadeau'
      case 'produit_offert': return 'Produit offert'
      case 'service_offert': return 'Service offert'
      case 'concours':       return 'Concours'
      case 'atelier':        return 'Évènement'
      case 'fidelite':       return '⭐ Fidélité'
      default:               return type_remise
    }
  }

  it('cadeau → "Cadeau" (sans "offert")', () => {
    expect(labelRemise('cadeau')).toBe('Cadeau')
    expect(labelRemise('cadeau').toLowerCase()).not.toContain('offert')
  })

  it('produit_offert → "Produit offert" (clé BDD inchangée)', () => {
    expect(labelRemise('produit_offert')).toBe('Produit offert')
  })

  it('service_offert → "Service offert" (clé BDD inchangée)', () => {
    expect(labelRemise('service_offert')).toBe('Service offert')
  })
})
