import { describe, it, expect } from 'vitest'

/* ── M7 — check_rate_limit() (SQL) : réplique la logique de fenêtre fixe ────
   pour la couvrir sans dépendre d'une vraie connexion Postgres. La fonction
   SQL elle-même est vérifiée par sql/test_post_migration_audit_M7.sql.
   ────────────────────────────────────────────────────────────────────────── */

function checkRateLimitSim(store, key, max, windowMs, now) {
  const entry = store.get(key)
  if (!entry || now - entry.windowStart >= windowMs) {
    store.set(key, { windowStart: now, count: 1 })
    return true
  }
  entry.count += 1
  return entry.count <= max
}

describe('M7 — simulation de check_rate_limit (fenêtre fixe)', () => {
  it('autorise jusqu\'à maxRequests dans la même fenêtre, refuse au-delà', () => {
    const store = new Map()
    const now = 1_000_000
    expect(checkRateLimitSim(store, 'k', 3, 60000, now)).toBe(true)      // 1
    expect(checkRateLimitSim(store, 'k', 3, 60000, now + 10)).toBe(true)  // 2
    expect(checkRateLimitSim(store, 'k', 3, 60000, now + 20)).toBe(true)  // 3
    expect(checkRateLimitSim(store, 'k', 3, 60000, now + 30)).toBe(false) // 4 > 3
  })

  it('redémarre le compteur une fois la fenêtre expirée', () => {
    const store = new Map()
    const now = 1_000_000
    checkRateLimitSim(store, 'k', 1, 1000, now)
    expect(checkRateLimitSim(store, 'k', 1, 1000, now + 500)).toBe(false) // encore dans la fenêtre
    expect(checkRateLimitSim(store, 'k', 1, 1000, now + 1500)).toBe(true) // fenêtre expirée, repart à 1
  })

  it('deux clés différentes (IP ou config différente) ne se gênent pas', () => {
    const store = new Map()
    const now = 1_000_000
    expect(checkRateLimitSim(store, 'a', 1, 60000, now)).toBe(true)
    expect(checkRateLimitSim(store, 'b', 1, 60000, now)).toBe(true)
  })
})
