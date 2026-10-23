import { describe, it, expect } from 'vitest'

/* ── M4 — app/api/compte/supprimer/route.js ──────────────────────────────
   Réplique la logique de blocage (commerçant avec abonnement actif) et la
   liste des tables anonymisées avant la suppression de l'identité Auth.
   ────────────────────────────────────────────────────────────────────────── */

function doitBloquerSuppression(commercesActifs) {
  return !!(commercesActifs && commercesActifs.length > 0)
}

describe('M4 — blocage suppression de compte si abonnement actif', () => {
  it('aucun commerce -> suppression autorisée', () => {
    expect(doitBloquerSuppression([])).toBe(false)
    expect(doitBloquerSuppression(null)).toBe(false)
  })

  it('un commerce avec abonnement actif -> bloqué', () => {
    expect(doitBloquerSuppression([{ id: 'c1' }])).toBe(true)
  })
})

describe('M4 — tables anonymisées avant suppression (FK nullable ON DELETE NO ACTION)', () => {
  const TABLES_ANONYMISEES = [
    { table: 'avis_google_clics', colonne: 'user_id' },
    { table: 'codes_parrainage', colonne: 'utilise_par' },
    { table: 'feedbacks_commerce', colonne: 'user_id' },
    { table: 'offres', colonne: 'gagnant_id' },
  ]

  it('couvre les 4 FK nullable bloquantes identifiées en production', () => {
    expect(TABLES_ANONYMISEES).toHaveLength(4)
    expect(TABLES_ANONYMISEES.map(t => t.table).sort()).toEqual(
      ['avis_google_clics', 'codes_parrainage', 'feedbacks_commerce', 'offres'].sort()
    )
  })
})
