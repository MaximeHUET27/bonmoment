import { describe, it, expect } from 'vitest'
import { getOffreTitle, getFullOffreTitle } from '../../lib/offreTitle.js'

/* ──────────────────────────────────────────────────────────────────────────
   Logique de typeLabel extraite du dashboard commerçant (dashboard/page.js)
   ────────────────────────────────────────────────────────────────────────── */

const TYPE_LABEL = {
  pourcentage:    o => `−${o.valeur}%`,
  montant_fixe:   o => `−${o.valeur}€`,
  montant:        o => `−${o.valeur}€`,
  cadeau:         () => '🎁 Cadeau',
  produit_offert: () => '📦 Offert',
  service_offert: () => '✂️ Service',
  offert:         () => '🎁 Offert',
  concours:       () => '🎰 Concours',
  atelier:        () => '🎉 Évènement',
  fidelite:       () => '⭐ Fidélité',
  anti_gaspi:     () => '🥗 Anti-gaspi',
}

function typeLabel(offre) {
  return TYPE_LABEL[offre.type_remise]?.(offre) ?? offre.type_remise ?? 'Offre'
}

/* ── Badge anti_gaspi (régression principale corrigée) ── */

describe('Dashboard badge — anti_gaspi corrigé', () => {
  it('anti_gaspi → "🥗 Anti-gaspi" (pas la clé brute)', () => {
    expect(typeLabel({ type_remise: 'anti_gaspi' })).toBe('🥗 Anti-gaspi')
  })

  it('anti_gaspi → pas "anti_gaspi" (clé brute)', () => {
    expect(typeLabel({ type_remise: 'anti_gaspi' })).not.toBe('anti_gaspi')
  })
})

/* ── Non-régression tous les types ── */

describe('Dashboard badge — non-régression 11 types', () => {
  it('pourcentage → −X%', () => {
    expect(typeLabel({ type_remise: 'pourcentage', valeur: 20 })).toBe('−20%')
  })

  it('montant_fixe → −X€', () => {
    expect(typeLabel({ type_remise: 'montant_fixe', valeur: 5 })).toBe('−5€')
  })

  it('montant → −X€', () => {
    expect(typeLabel({ type_remise: 'montant', valeur: 3 })).toBe('−3€')
  })

  it('cadeau → 🎁 Cadeau', () => {
    expect(typeLabel({ type_remise: 'cadeau' })).toBe('🎁 Cadeau')
  })

  it('produit_offert → 📦 Offert', () => {
    expect(typeLabel({ type_remise: 'produit_offert' })).toBe('📦 Offert')
  })

  it('service_offert → ✂️ Service', () => {
    expect(typeLabel({ type_remise: 'service_offert' })).toBe('✂️ Service')
  })

  it('offert → 🎁 Offert', () => {
    expect(typeLabel({ type_remise: 'offert' })).toBe('🎁 Offert')
  })

  it('concours → 🎰 Concours', () => {
    expect(typeLabel({ type_remise: 'concours' })).toBe('🎰 Concours')
  })

  it('atelier → 🎉 Évènement', () => {
    expect(typeLabel({ type_remise: 'atelier' })).toBe('🎉 Évènement')
  })

  it('fidelite → ⭐ Fidélité', () => {
    expect(typeLabel({ type_remise: 'fidelite' })).toBe('⭐ Fidélité')
  })

  it('anti_gaspi → 🥗 Anti-gaspi', () => {
    expect(typeLabel({ type_remise: 'anti_gaspi' })).toBe('🥗 Anti-gaspi')
  })

  it('type inconnu → fallback sur la clé (comportement dégradé)', () => {
    expect(typeLabel({ type_remise: 'inconnu' })).toBe('inconnu')
  })
})

/* ── Pas de doublon emoji dans les titres des cartes ── */

describe('Dashboard titres — getOffreTitle sans emoji préfixé', () => {
  const CAS = [
    { type: 'cadeau',       titre: 'café offert' },
    { type: 'atelier',      titre: 'initiation pâtisserie' },
    { type: 'concours',     titre: 'gagnez un soin' },
    { type: 'fidelite',     titre: 'points doublés' },
    { type: 'anti_gaspi',   titre: 'panier du soir' },
    { type: 'pourcentage',  titre: 'coupes homme', valeur: 20 },
    { type: 'montant_fixe', titre: 'repas midi', valeur: 5 },
  ]

  for (const { type, titre, valeur } of CAS) {
    it(`${type} → getOffreTitle retourne le titre brut (pas d'emoji)`, () => {
      const offre = { type_remise: type, valeur: valeur ?? null, titre }
      expect(getOffreTitle(offre)).toBe(titre)
    })
  }

  it('getOffreTitle ≠ getFullOffreTitle pour les types avec emoji', () => {
    const types = ['cadeau', 'atelier', 'concours', 'fidelite', 'anti_gaspi']
    for (const type of types) {
      const offre = { type_remise: type, titre: 'mon titre' }
      expect(getOffreTitle(offre)).toBe('mon titre')
      expect(getFullOffreTitle(offre)).not.toBe('mon titre')
    }
  })
})

/* ── Cohérence badge vs getFullOffreTitle (pour le partage social) ── */

describe('Dashboard — getFullOffreTitle conservé pour le partage', () => {
  it('anti_gaspi → getFullOffreTitle préfixe 🥗 (partage social)', () => {
    expect(getFullOffreTitle({ type_remise: 'anti_gaspi', titre: 'panier' })).toMatch(/^🥗/)
  })

  it('cadeau → getFullOffreTitle préfixe 🎁 (partage social)', () => {
    expect(getFullOffreTitle({ type_remise: 'cadeau', titre: 'café' })).toMatch(/^🎁/)
  })
})
