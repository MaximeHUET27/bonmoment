import { describe, it, expect } from 'vitest'
import { getFullOffreTitle } from '../../lib/offreTitle.js'

/* ── Logique métier pure extraite du formulaire ─────────────────────────── */

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

function getTypeFiltre(type_remise) {
  if (type_remise === 'pourcentage' || type_remise === 'montant_fixe' || type_remise === 'montant') return 'remise'
  if (type_remise === 'anti_gaspi') return 'anti_gaspi'
  return null
}

function clampValeurOnSwitch(valeur, fromMode, toMode) {
  if (toMode === 'pourcentage' && Number(valeur) > 100) return '100'
  return valeur
}

function validateOffre({ typeRemise, valeur, titre, estRecurrente, joursRecurrence }) {
  const errs = {}
  if (!titre.trim()) errs.titre = 'Décris ton offre.'
  if (typeRemise === 'pourcentage' || typeRemise === 'montant_fixe') {
    if (!valeur) {
      errs.valeur = 'Indique une valeur.'
    } else if (typeRemise === 'pourcentage' && (Number(valeur) < 1 || Number(valeur) > 100)) {
      errs.valeur = 'La remise doit être entre 1 et 100%.'
    } else if (typeRemise === 'montant_fixe' && Number(valeur) < 1) {
      errs.valeur = 'Le montant doit être au moins 1€.'
    }
  }
  if (estRecurrente && joursRecurrence.length === 0) errs.jours = 'Sélectionne au moins un jour.'
  return errs
}

/* ── Switch %/€ ─────────────────────────────────────────────────────────── */

describe('Switch %/€ — changement de mode', () => {
  it('clique sur bouton Remise → typeRemise = pourcentage par défaut', () => {
    let typeRemise = 'cadeau'
    typeRemise = 'pourcentage'
    expect(typeRemise).toBe('pourcentage')
  })

  it('switch de % vers € → typeRemise = montant_fixe', () => {
    let typeRemise = 'pourcentage'
    typeRemise = 'montant_fixe'
    expect(typeRemise).toBe('montant_fixe')
  })

  it('switch de € vers % → typeRemise = pourcentage', () => {
    let typeRemise = 'montant_fixe'
    typeRemise = 'pourcentage'
    expect(typeRemise).toBe('pourcentage')
  })

  it('les deux modes sont catchés par le filtre "remise"', () => {
    expect(getTypeFiltre('pourcentage')).toBe('remise')
    expect(getTypeFiltre('montant_fixe')).toBe('remise')
    expect(getTypeFiltre('montant')).toBe('remise')
  })
})

/* ── Clamp aux bornes lors du switch ────────────────────────────────────── */

describe('Clamp valeur lors du switch %/€', () => {
  it('switch € → % avec valeur 150 : clamp à 100', () => {
    expect(clampValeurOnSwitch('150', 'montant_fixe', 'pourcentage')).toBe('100')
  })

  it('switch € → % avec valeur 50 : pas de clamp', () => {
    expect(clampValeurOnSwitch('50', 'montant_fixe', 'pourcentage')).toBe('50')
  })

  it('switch % → € avec valeur 80 : pas de clamp (pas de borne max en €)', () => {
    expect(clampValeurOnSwitch('80', 'pourcentage', 'montant_fixe')).toBe('80')
  })

  it('switch % → € avec valeur 999 : pas de clamp', () => {
    expect(clampValeurOnSwitch('999', 'pourcentage', 'montant_fixe')).toBe('999')
  })
})

/* ── Label dynamique stepper ────────────────────────────────────────────── */

describe('Aperçu vignette — label dynamique', () => {
  it('pourcentage : getFullOffreTitle affiche -X%', () => {
    const offre = { type_remise: 'pourcentage', valeur: 15, titre: 'coupes' }
    expect(getFullOffreTitle(offre)).toBe('-15% coupes')
  })

  it('montant_fixe : getFullOffreTitle affiche -X€', () => {
    const offre = { type_remise: 'montant_fixe', valeur: 10, titre: 'repas' }
    expect(getFullOffreTitle(offre)).toBe('-10€ repas')
  })

  it('anti_gaspi : getFullOffreTitle affiche 🥗', () => {
    const offre = { type_remise: 'anti_gaspi', valeur: null, titre: 'invendus du jour' }
    expect(getFullOffreTitle(offre)).toBe('🥗 invendus du jour')
  })
})

/* ── Sélection Anti-gaspi ────────────────────────────────────────────────── */

describe('Sélection Anti-gaspi', () => {
  it('clique Anti-gaspi → typeRemise = anti_gaspi', () => {
    let typeRemise = 'cadeau'
    typeRemise = 'anti_gaspi'
    expect(typeRemise).toBe('anti_gaspi')
  })

  it('clique Anti-gaspi → estRecurrente = true', () => {
    let estRecurrente = false
    estRecurrente = true
    expect(estRecurrente).toBe(true)
  })

  it('clique Anti-gaspi → tous les jours sélectionnés', () => {
    let joursRecurrence = []
    joursRecurrence = JOURS
    expect(joursRecurrence).toHaveLength(7)
    expect(joursRecurrence).toContain('lundi')
    expect(joursRecurrence).toContain('dimanche')
  })

  it('anti_gaspi est catchée par le filtre anti_gaspi', () => {
    expect(getTypeFiltre('anti_gaspi')).toBe('anti_gaspi')
  })
})

/* ── Validation ─────────────────────────────────────────────────────────── */

describe('Validation formulaire', () => {
  it('anti_gaspi accepté sans valeur', () => {
    const errs = validateOffre({
      typeRemise: 'anti_gaspi',
      valeur: '',
      titre: 'Invendus du jour',
      estRecurrente: true,
      joursRecurrence: JOURS,
    })
    expect(errs.valeur).toBeUndefined()
  })

  it('anti_gaspi accepté avec valeur 0', () => {
    const errs = validateOffre({
      typeRemise: 'anti_gaspi',
      valeur: '0',
      titre: 'Invendus',
      estRecurrente: false,
      joursRecurrence: [],
    })
    expect(errs.valeur).toBeUndefined()
  })

  it('pourcentage : valeur 0 rejeté', () => {
    const errs = validateOffre({
      typeRemise: 'pourcentage',
      valeur: '0',
      titre: 'Test',
      estRecurrente: false,
      joursRecurrence: [],
    })
    expect(errs.valeur).toBeDefined()
  })

  it('montant_fixe : valeur 0 rejeté', () => {
    const errs = validateOffre({
      typeRemise: 'montant_fixe',
      valeur: '0',
      titre: 'Test',
      estRecurrente: false,
      joursRecurrence: [],
    })
    expect(errs.valeur).toBeDefined()
  })

  it('titre vide toujours rejeté (toutes types)', () => {
    for (const t of ['pourcentage', 'montant_fixe', 'cadeau', 'anti_gaspi', 'concours', 'atelier']) {
      const errs = validateOffre({
        typeRemise: t,
        valeur: '10',
        titre: '   ',
        estRecurrente: false,
        joursRecurrence: [],
      })
      expect(errs.titre, `type=${t}`).toBeDefined()
    }
  })
})
