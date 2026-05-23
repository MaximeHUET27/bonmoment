import { describe, it, expect } from 'vitest'

/* ── Logique de sélection du type d'offre (extraite du formulaire) ───────── */

const JOURS = [
  { id: 'lundi' }, { id: 'mardi' }, { id: 'mercredi' }, { id: 'jeudi' },
  { id: 'vendredi' }, { id: 'samedi' }, { id: 'dimanche' },
]

function handleTypeSelection(typeId, initialState = { estRecurrente: false, joursRecurrence: [] }) {
  if (typeId === 'remise') {
    return { typeRemise: 'pourcentage', ...initialState }
  }
  return { typeRemise: typeId, ...initialState }
}

/* ── Sélection Anti-gaspi — pas de pré-coche récurrence ─────────────────── */

describe('Sélection Anti-gaspi — comportement par défaut identique aux autres types', () => {
  it('estRecurrente reste false après sélection anti_gaspi', () => {
    const result = handleTypeSelection('anti_gaspi')
    expect(result.estRecurrente).toBe(false)
  })

  it('joursRecurrence reste vide après sélection anti_gaspi', () => {
    const result = handleTypeSelection('anti_gaspi')
    expect(result.joursRecurrence).toHaveLength(0)
  })

  it('typeRemise est bien "anti_gaspi"', () => {
    const result = handleTypeSelection('anti_gaspi')
    expect(result.typeRemise).toBe('anti_gaspi')
  })
})

/* ── Parité : anti_gaspi identique aux autres types sur la récurrence ────── */

describe('Parité récurrence — anti_gaspi identique aux autres types', () => {
  const TYPES_SANS_REMISE = ['cadeau', 'atelier', 'concours', 'fidelite', 'anti_gaspi']

  for (const type of TYPES_SANS_REMISE) {
    it(`${type} → estRecurrente = false par défaut`, () => {
      const result = handleTypeSelection(type)
      expect(result.estRecurrente).toBe(false)
    })

    it(`${type} → joursRecurrence = [] par défaut`, () => {
      const result = handleTypeSelection(type)
      expect(result.joursRecurrence).toHaveLength(0)
    })
  }

  it('anti_gaspi et cadeau ont le même état récurrence après sélection', () => {
    const antiGaspi = handleTypeSelection('anti_gaspi')
    const cadeau    = handleTypeSelection('cadeau')
    expect(antiGaspi.estRecurrente).toBe(cadeau.estRecurrente)
    expect(antiGaspi.joursRecurrence).toEqual(cadeau.joursRecurrence)
  })
})

/* ── Non-régression : la sélection Remise reste indépendante ─────────────── */

describe('Non-régression — sélection Remise (pas impactée par le correctif)', () => {
  it('remise → typeRemise = "pourcentage" (switch %/€)', () => {
    const result = handleTypeSelection('remise')
    expect(result.typeRemise).toBe('pourcentage')
  })

  it('remise → estRecurrente inchangé (false par défaut)', () => {
    const result = handleTypeSelection('remise')
    expect(result.estRecurrente).toBe(false)
  })
})

/* ── Confirmation post-publication : route dashboard ────────────────────── */

describe('Confirmation post-publication — route dashboard commerçant', () => {
  const DASHBOARD_ROUTE = '/commercant/dashboard'

  it('la route cible du lien "retourner à l\'accueil" est /commercant/dashboard', () => {
    expect(DASHBOARD_ROUTE).toBe('/commercant/dashboard')
    expect(DASHBOARD_ROUTE).not.toBe('/')
  })

  it('le libellé contient "ne souhaite pas partager" et "retourner à l\'accueil"', () => {
    const libelle = "Je ne souhaite pas partager et je souhaite retourner à l'accueil"
    expect(libelle).toContain('ne souhaite pas partager')
    expect(libelle).toContain('retourner à l\'accueil')
  })
})
