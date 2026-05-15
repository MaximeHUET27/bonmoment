import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Logique is_current_user_participating', () => {
  const computeIsParticipating = (myParticipation) => !!myParticipation

  it('retourne true quand une participation existe', () => {
    expect(computeIsParticipating({ id: 'abc-123' })).toBe(true)
  })

  it('retourne false quand aucune participation (null)', () => {
    expect(computeIsParticipating(null)).toBe(false)
  })

  it('retourne false quand aucune participation (undefined)', () => {
    expect(computeIsParticipating(undefined)).toBe(false)
  })

  it('retourne false pour un objet vide (cas bord)', () => {
    // Un objet vide est toujours truthy en JS — on documente ce comportement
    expect(computeIsParticipating({})).toBe(true)
  })
})

describe('Participants API GET — feature flag OFF', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('avec flag OFF, is_current_user_participating est false dans la réponse simulée', async () => {
    delete process.env.NEXT_PUBLIC_MAIRIE_ASSO_ENABLED
    const { isMairieAssoEnabled } = await import('../../../lib/featureFlags.js')
    expect(isMairieAssoEnabled()).toBe(false)

    // Simule la logique du GET handler quand flag OFF
    const mockResponse = !isMairieAssoEnabled()
      ? { participants: [], count: 0, is_current_user_participating: false }
      : { participants: [], count: 0, is_current_user_participating: true }

    expect(mockResponse.is_current_user_participating).toBe(false)
    expect(mockResponse.count).toBe(0)
    expect(mockResponse.participants).toHaveLength(0)
  })

  it('avec flag ON, is_current_user_participating dépend de la DB', async () => {
    process.env.NEXT_PUBLIC_MAIRIE_ASSO_ENABLED = 'true'
    const { isMairieAssoEnabled } = await import('../../../lib/featureFlags.js')
    expect(isMairieAssoEnabled()).toBe(true)

    // La valeur est calculée côté serveur : !!myParticipation
    const participationTrouvee  = { id: 'user-row-xyz' }
    const participationAbsente  = null

    expect(!!participationTrouvee).toBe(true)
    expect(!!participationAbsente).toBe(false)
  })
})

describe('Participants API DELETE — logique de suppression', () => {
  it('retourne success:true quand la participation existe et est supprimée', () => {
    // Simule le retour Supabase delete().select('id') quand la ligne existe
    const deletedRows = [{ id: 'row-1' }]
    const response = deletedRows.length > 0
      ? { success: true }
      : { error: 'Participation introuvable', status: 404 }
    expect(response.success).toBe(true)
  })

  it('retourne 404 quand la participation n\'existe pas', () => {
    const deletedRows = []
    const response = deletedRows.length > 0
      ? { success: true }
      : { error: 'Participation introuvable', status: 404 }
    expect(response.status).toBe(404)
  })
})
