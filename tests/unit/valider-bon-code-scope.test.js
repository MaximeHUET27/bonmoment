import { describe, it, expect } from 'vitest'

/* ── M3 — app/api/valider-bon/route.js : scope de recherche par code ────────
   Réplique la logique de construction de la liste de commerces autorisés
   (propres commerces + mairies/assos dont le commerçant est membre accepté)
   et la distinction d'erreur PGRST116 (plusieurs lignes) vs "Code invalide".
   ────────────────────────────────────────────────────────────────────────── */

function allowedCommerceIds(commerceIds, membresAsso) {
  const assoIds = (membresAsso || [])
    .filter(m => m.commerces?.categorie_bonmoment === 'mairie_asso')
    .map(m => m.mairie_asso_id)
  return [...commerceIds, ...assoIds]
}

describe('M3 — périmètre de recherche par code_validation', () => {
  it('sans mairie/asso : périmètre = les commerces propres uniquement', () => {
    expect(allowedCommerceIds(['c1', 'c2'], [])).toEqual(['c1', 'c2'])
  })

  it('avec une adhésion mairie/asso acceptée : son id est ajouté au périmètre', () => {
    const membres = [{ mairie_asso_id: 'mairie1', commerces: { categorie_bonmoment: 'mairie_asso' } }]
    expect(allowedCommerceIds(['c1'], membres)).toEqual(['c1', 'mairie1'])
  })

  it("une adhésion dont le commerce cible n'est pas une mairie/asso est ignorée", () => {
    const membres = [{ mairie_asso_id: 'x', commerces: { categorie_bonmoment: 'restaurant' } }]
    expect(allowedCommerceIds(['c1'], membres)).toEqual(['c1'])
  })

  it('membresAsso null/undefined ne casse pas (pas de résultat de requête)', () => {
    expect(allowedCommerceIds(['c1'], null)).toEqual(['c1'])
    expect(allowedCommerceIds(['c1'], undefined)).toEqual(['c1'])
  })
})

describe('M3 — distinction PGRST116 (code ambigu) vs code invalide', () => {
  function messageErreur(fetchErr) {
    if (fetchErr?.code === 'PGRST116') {
      return 'Plusieurs bons correspondent à ce code — utilise le scan QR pour celui-ci'
    }
    return 'Code invalide'
  }

  it('PGRST116 (plusieurs lignes, code partagé par deux offres du même commerçant) -> message explicite', () => {
    expect(messageErreur({ code: 'PGRST116' })).toBe('Plusieurs bons correspondent à ce code — utilise le scan QR pour celui-ci')
  })

  it('autre erreur ou absence de résultat -> "Code invalide" (ne révèle pas si le code existe ailleurs)', () => {
    expect(messageErreur({ code: 'PGRST000' })).toBe('Code invalide')
    expect(messageErreur(undefined)).toBe('Code invalide')
  })
})
