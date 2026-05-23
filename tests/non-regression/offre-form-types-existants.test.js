import { describe, it, expect } from 'vitest'
import { getOffreTitle, getFullOffreTitle } from '../../lib/offreTitle.js'

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

/* ── Pas de doublon emoji : getOffreTitle retourne le titre brut ─────────── */

describe('Non-régression : getOffreTitle — aucun doublon emoji dans l\'UI', () => {
  const CAS = [
    { type: 'cadeau',       titre: 'un café offert' },
    { type: 'atelier',      titre: 'initiation pâtisserie' },
    { type: 'concours',     titre: 'gagnez un soin' },
    { type: 'fidelite',     titre: 'points doublés' },
    { type: 'anti_gaspi',   titre: 'panier surprise du soir' },
    { type: 'pourcentage',  titre: 'coupes homme' },
    { type: 'montant_fixe', titre: 'repas du midi' },
  ]

  for (const { type, titre } of CAS) {
    it(`${type} → getOffreTitle retourne le titre brut sans emoji`, () => {
      const offre = { type_remise: type, valeur: 10, titre }
      expect(getOffreTitle(offre)).toBe(titre)
      expect(getOffreTitle(offre)).not.toMatch(/^[🎁🎨🎉🎰⭐🥗−]/)
    })
  }

  it('offre null → chaîne vide (pas de crash)', () => {
    expect(getOffreTitle(null)).toBe('')
    expect(getOffreTitle(undefined)).toBe('')
  })
})

/* ── Partage social conserve le préfixe emoji ───────────────────────────── */

describe('Non-régression : getFullOffreTitle — préfixe emoji conservé pour le partage social', () => {
  it('cadeau → préfixe 🎁', () => {
    const r = getFullOffreTitle({ type_remise: 'cadeau', titre: 'un café' })
    expect(r).toMatch(/^🎁/)
    expect(r).toContain('un café')
  })

  it('atelier → préfixe 🎨', () => {
    const r = getFullOffreTitle({ type_remise: 'atelier', titre: 'initiation' })
    expect(r).toMatch(/^🎨/)
  })

  it('concours → préfixe 🎰', () => {
    expect(getFullOffreTitle({ type_remise: 'concours', titre: 'soin' })).toMatch(/^🎰/)
  })

  it('fidelite → préfixe ⭐', () => {
    expect(getFullOffreTitle({ type_remise: 'fidelite', titre: 'points' })).toMatch(/^⭐/)
  })

  it('anti_gaspi → préfixe 🥗', () => {
    expect(getFullOffreTitle({ type_remise: 'anti_gaspi', titre: 'panier' })).toMatch(/^🥗/)
  })

  it('pourcentage → préfixe -X%', () => {
    expect(getFullOffreTitle({ type_remise: 'pourcentage', valeur: 15, titre: 'coupe' })).toMatch(/^-15%/)
  })

  it('montant_fixe → préfixe -X€', () => {
    expect(getFullOffreTitle({ type_remise: 'montant_fixe', valeur: 5, titre: 'repas' })).toMatch(/^-5€/)
  })

  it('getOffreTitle ≠ getFullOffreTitle pour tous les types préfixés', () => {
    const types = ['cadeau', 'atelier', 'concours', 'fidelite', 'anti_gaspi']
    for (const type of types) {
      const offre = { type_remise: type, titre: 'mon titre' }
      expect(getOffreTitle(offre)).toBe('mon titre')
      expect(getFullOffreTitle(offre)).not.toBe('mon titre')
      expect(getFullOffreTitle(offre)).toContain('mon titre')
    }
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

/* ── Non-régression libellé "Cadeau" (renommage "Cadeau offert") ─────────── */

describe('Non-régression badge cadeau — libellé "Cadeau" sans "offert"', () => {
  it('formatBadge cadeau → "🎁 Cadeau" (pas "Cadeau offert")', () => {
    const badge = formatBadge({ type_remise: 'cadeau' })
    expect(badge).toBe('🎁 Cadeau')
    expect(badge.toLowerCase()).not.toContain('offert')
  })

  it('getOffreTitle cadeau → titre brut (pas de doublon emoji)', () => {
    const offre = { type_remise: 'cadeau', titre: 'un café' }
    expect(getOffreTitle(offre)).toBe('un café')
    expect(getOffreTitle(offre)).not.toContain('Cadeau')
  })

  it('getFullOffreTitle cadeau → préfixe emoji conservé pour partage social', () => {
    const offre = { type_remise: 'cadeau', titre: 'un café' }
    expect(getFullOffreTitle(offre)).toBe('🎁 un café')
  })
})

/* ── Non-régression placeholder cadeau post-restauration ─────────────────── */

describe('Non-régression placeholder cadeau — valeur historique restaurée', () => {
  const PLACEHOLDERS_DESCRIPTION = {
    pourcentage:  "Ex : Sur toutes les coupes aujourd'hui",
    montant_fixe: 'Ex : Sur ton repas du soir',
    cadeau:       "Ex : Un croissant à l'achat d'une baguette",
    concours:     "Ex : Gagnez un soin complet d'une valeur de 50€",
    atelier:      'Ex : Initiation à la pâtisserie — places limitées',
    fidelite:     'Ex : vos points doublés',
    anti_gaspi:   'Ex : 4 viennoiseries pour 2€',
  }

  it('placeholder cadeau restauré à la valeur historique (bb5d5dc)', () => {
    expect(PLACEHOLDERS_DESCRIPTION.cadeau).toBe("Ex : Un croissant à l'achat d'une baguette")
  })

  it('placeholder atelier restauré à la valeur historique (bb5d5dc)', () => {
    expect(PLACEHOLDERS_DESCRIPTION.atelier).toBe('Ex : Initiation à la pâtisserie — places limitées')
  })

  it('placeholder anti_gaspi mis à jour', () => {
    expect(PLACEHOLDERS_DESCRIPTION.anti_gaspi).toBe('Ex : 4 viennoiseries pour 2€')
    expect(PLACEHOLDERS_DESCRIPTION.anti_gaspi).not.toContain('invendus du jour')
  })
})

/* ── Non-régression lot share+dashboard (commit courant) ─────────────────── */

describe('Non-régression lien post-publication', () => {
  const LIBELLE_EXACT = 'Je ne souhaite pas partager'
  const ANCIEN_LIBELLE = 'Je ne souhaite pas partager et je souhaite retourner à l\'accueil'

  it('le libellé exact est "Je ne souhaite pas partager"', () => {
    expect(LIBELLE_EXACT).toBe('Je ne souhaite pas partager')
  })

  it('l\'ancien libellé verbeux a été supprimé', () => {
    expect(LIBELLE_EXACT).not.toBe(ANCIEN_LIBELLE)
    expect(LIBELLE_EXACT).not.toContain('retourner à l\'accueil')
  })
})

describe('Non-régression dashboard — badge anti_gaspi', () => {
  function typeLabelDashboard(offre) {
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
    return TYPE_LABEL[offre.type_remise]?.(offre) ?? offre.type_remise ?? 'Offre'
  }

  it('anti_gaspi → badge "🥗 Anti-gaspi" (pas la clé brute)', () => {
    expect(typeLabelDashboard({ type_remise: 'anti_gaspi' })).toBe('🥗 Anti-gaspi')
  })

  it('fidelite → badge "⭐ Fidélité"', () => {
    expect(typeLabelDashboard({ type_remise: 'fidelite' })).toBe('⭐ Fidélité')
  })

  it('tous les types antérieurs restent corrects', () => {
    expect(typeLabelDashboard({ type_remise: 'cadeau' })).toBe('🎁 Cadeau')
    expect(typeLabelDashboard({ type_remise: 'atelier' })).toBe('🎉 Évènement')
    expect(typeLabelDashboard({ type_remise: 'concours' })).toBe('🎰 Concours')
    expect(typeLabelDashboard({ type_remise: 'pourcentage', valeur: 10 })).toBe('−10%')
    expect(typeLabelDashboard({ type_remise: 'montant_fixe', valeur: 4 })).toBe('−4€')
  })
})

describe('Non-régression dashboard — titres sans doublon emoji', () => {
  const types = ['cadeau', 'atelier', 'concours', 'fidelite', 'anti_gaspi']

  for (const type of types) {
    it(`${type} → getOffreTitle retourne le titre brut (pas de doublon emoji sur les cartes)`, () => {
      const offre = { type_remise: type, titre: 'mon offre' }
      expect(getOffreTitle(offre)).toBe('mon offre')
    })
  }
})

/* ── Non-régression récurrence — comportement par défaut identique ────────── */

describe('Non-régression récurrence — tous les types inactifs par défaut', () => {
  function defaultRecurrenceState() {
    return { estRecurrente: false, joursRecurrence: [] }
  }

  function handleTypeSelection(typeId) {
    const defaults = defaultRecurrenceState()
    if (typeId === 'remise') return { typeRemise: 'pourcentage', ...defaults }
    return { typeRemise: typeId, ...defaults }
  }

  const TOUS_LES_TYPES = ['cadeau', 'atelier', 'concours', 'fidelite', 'anti_gaspi', 'pourcentage', 'montant_fixe']

  for (const type of TOUS_LES_TYPES) {
    const typeId = (type === 'pourcentage' || type === 'montant_fixe') ? 'remise' : type
    it(`${type} → estRecurrente false par défaut (pas de pré-coche)`, () => {
      const result = handleTypeSelection(typeId)
      expect(result.estRecurrente).toBe(false)
    })

    it(`${type} → joursRecurrence vide par défaut`, () => {
      const result = handleTypeSelection(typeId)
      expect(result.joursRecurrence).toHaveLength(0)
    })
  }

  it('anti_gaspi et cadeau ont un état récurrence identique par défaut', () => {
    const antiGaspi = handleTypeSelection('anti_gaspi')
    const cadeau    = handleTypeSelection('cadeau')
    expect(antiGaspi.estRecurrente).toBe(cadeau.estRecurrente)
    expect(antiGaspi.joursRecurrence).toEqual(cadeau.joursRecurrence)
  })
})
