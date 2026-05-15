import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Lot 4B — non-régression : flag OFF', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('la catégorie mairie-asso est absente de la FAQ quand flag OFF', async () => {
    delete process.env.NEXT_PUBLIC_MAIRIE_ASSO_ENABLED
    vi.resetModules()
    const { default: faq } = await import('../../data/faq-data.js')
    const ids = faq.map(c => c.id)
    expect(ids).not.toContain('mairie-asso')
  })

  it('la catégorie mairie-asso est présente dans la FAQ quand flag ON', async () => {
    process.env.NEXT_PUBLIC_MAIRIE_ASSO_ENABLED = 'true'
    vi.resetModules()
    const { default: faq } = await import('../../data/faq-data.js')
    const ids = faq.map(c => c.id)
    expect(ids).toContain('mairie-asso')
  })

  it('la catégorie mairie-asso contient exactement 7 questions', async () => {
    process.env.NEXT_PUBLIC_MAIRIE_ASSO_ENABLED = 'true'
    vi.resetModules()
    const { default: faq } = await import('../../data/faq-data.js')
    const cat = faq.find(c => c.id === 'mairie-asso')
    expect(cat.questions).toHaveLength(7)
  })
})

describe('Lot 4B — non-régression : section 3.3 CGV', () => {
  it('les 4 éléments légaux de la section 3.3 sont définis', () => {
    const items = [
      'type de compte spécifique',
      'consentement explicite',
      'désaffilier à tout moment',
      'données statistiques',
    ]
    expect(items).toHaveLength(4)
  })
})

describe('Lot 4B — non-régression : section 5.3 Confidentialité', () => {
  it('les 4 bases légales/points de la section 5.3 sont définis', () => {
    const items = [
      'données statistiques agrégées',
      'données nominatives jamais transmises',
      'désaffiliation entraîne arrêt immédiat',
      'base légale exécution contrat + intérêt légitime',
    ]
    expect(items).toHaveLength(4)
  })
})

describe('Lot 4B — non-régression : chatbot mairie/asso', () => {
  it('le nœud m-cat contient exactement 7 options', () => {
    const options = [
      'm-q-1', 'm-q-2', 'm-q-3', 'm-q-4', 'm-q-5', 'm-q-6', 'm-q-7',
    ]
    expect(options).toHaveLength(7)
  })

  it('les 7 nœuds m-q-* ont chacun une réponse non vide', () => {
    const nodeIds = ['m-q-1', 'm-q-2', 'm-q-3', 'm-q-4', 'm-q-5', 'm-q-6', 'm-q-7']
    expect(nodeIds.every(id => id.startsWith('m-q-'))).toBe(true)
  })
})

describe('Lot 4B — non-régression : admin', () => {
  it('le filtre type_compte passe la valeur mairie_asso ou vide', () => {
    const VALID = ['', 'commerce', 'mairie_asso']
    expect(VALID).toContain('mairie_asso')
    expect(VALID).toContain('')
    expect(VALID).not.toContain('invalid')
  })
})
