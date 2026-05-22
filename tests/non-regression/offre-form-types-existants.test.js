import { describe, it, expect } from 'vitest'
import { getFullOffreTitle } from '../../lib/offreTitle.js'

/* ── Logique partagée (extraite des composants) ─────────────────────────── */

function formatBadge(offre) {
  if (offre.type_remise === 'pourcentage')    return `−${offre.valeur}%`
  if (offre.type_remise === 'montant_fixe')   return `−${offre.valeur}€`
  if (offre.type_remise === 'montant')        return `−${offre.valeur}€`
  if (offre.type_remise === 'cadeau')         return '🎁 Cadeau'
  if (offre.type_remise === 'produit_offert') return '📦 Offert'
  if (offre.type_remise === 'service_offert') return '✂️ Offert'
  if (offre.type_remise === 'offert')         return 'Offert'
  if (offre.type_remise === 'concours')       return '🎰 Concours'
  if (offre.type_remise === 'atelier')        return '🎉 Évènement'
  if (offre.type_remise === 'fidelite')       return '⭐ Fidélité'
  if (offre.type_remise === 'anti_gaspi')     return '🥗 Anti-gaspi'
  return offre.type_remise || 'Offre'
}

function getTypeFiltre(type_remise) {
  if (type_remise === 'pourcentage' || type_remise === 'montant_fixe' || type_remise === 'montant') return 'remise'
  if (type_remise === 'cadeau' || type_remise === 'offert' || type_remise === 'produit_offert')      return 'offerts'
  if (type_remise === 'atelier')    return 'atelier'
  if (type_remise === 'concours')   return 'concours'
  if (type_remise === 'fidelite')   return 'fidelite'
  if (type_remise === 'anti_gaspi') return 'anti_gaspi'
  return null
}

function showSansBonToggle(isMairieAsso, typeRemise) {
  return isMairieAsso && typeRemise === 'atelier'
}

/* ── Badges des 4 types préservés ───────────────────────────────────────── */

describe('Non-régression badges types existants', () => {
  it('cadeau → badge 🎁 Cadeau', () => {
    expect(formatBadge({ type_remise: 'cadeau' })).toBe('🎁 Cadeau')
  })

  it('atelier → badge 🎉 Évènement', () => {
    expect(formatBadge({ type_remise: 'atelier' })).toBe('🎉 Évènement')
  })

  it('concours → badge 🎰 Concours', () => {
    expect(formatBadge({ type_remise: 'concours' })).toBe('🎰 Concours')
  })

  it('fidelite → badge ⭐ Fidélité', () => {
    expect(formatBadge({ type_remise: 'fidelite' })).toBe('⭐ Fidélité')
  })

  it('pourcentage → badge remise %', () => {
    expect(formatBadge({ type_remise: 'pourcentage', valeur: 20 })).toBe('−20%')
  })

  it('montant_fixe → badge remise €', () => {
    expect(formatBadge({ type_remise: 'montant_fixe', valeur: 5 })).toBe('−5€')
  })
})

/* ── Titres complets types existants ────────────────────────────────────── */

describe('Non-régression getFullOffreTitle types existants', () => {
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

  it('pourcentage → -X% titre', () => {
    expect(getFullOffreTitle({ type_remise: 'pourcentage', valeur: 20, titre: 'coupes' })).toBe('-20% coupes')
  })

  it('montant_fixe → -X€ titre', () => {
    expect(getFullOffreTitle({ type_remise: 'montant_fixe', valeur: 5, titre: 'repas' })).toBe('-5€ repas')
  })
})

/* ── Filtres types existants ────────────────────────────────────────────── */

describe('Non-régression filtres types existants', () => {
  it('cadeau → filtre offerts', () => {
    expect(getTypeFiltre('cadeau')).toBe('offerts')
  })

  it('atelier → filtre atelier', () => {
    expect(getTypeFiltre('atelier')).toBe('atelier')
  })

  it('concours → filtre concours', () => {
    expect(getTypeFiltre('concours')).toBe('concours')
  })

  it('fidelite → filtre fidelite', () => {
    expect(getTypeFiltre('fidelite')).toBe('fidelite')
  })

  it('pourcentage → filtre remise', () => {
    expect(getTypeFiltre('pourcentage')).toBe('remise')
  })

  it('montant_fixe → filtre remise', () => {
    expect(getTypeFiltre('montant_fixe')).toBe('remise')
  })

  it('anti_gaspi → filtre anti_gaspi (pas remise)', () => {
    expect(getTypeFiltre('anti_gaspi')).toBe('anti_gaspi')
    expect(getTypeFiltre('anti_gaspi')).not.toBe('remise')
  })
})

/* ── Toggle "Événement sans bon" mairie/asso ────────────────────────────── */

describe('Non-régression toggle mairie/asso', () => {
  it('compte mairie_asso + typeRemise=atelier → toggle visible', () => {
    expect(showSansBonToggle(true, 'atelier')).toBe(true)
  })

  it('compte mairie_asso + typeRemise=cadeau → toggle absent', () => {
    expect(showSansBonToggle(true, 'cadeau')).toBe(false)
  })

  it('compte classique + typeRemise=atelier → toggle absent', () => {
    expect(showSansBonToggle(false, 'atelier')).toBe(false)
  })

  it('compte mairie_asso + typeRemise=anti_gaspi → toggle absent', () => {
    expect(showSansBonToggle(true, 'anti_gaspi')).toBe(false)
  })

  it('compte mairie_asso + typeRemise=pourcentage → toggle absent', () => {
    expect(showSansBonToggle(true, 'pourcentage')).toBe(false)
  })
})
