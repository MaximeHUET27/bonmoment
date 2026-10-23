import { describe, it, expect, vi } from 'vitest'

/* ── P1 — app/components/NotifBottomSheet.js ─────────────────────────────
   Réplique la logique de l'effet qui détermine l'état réel de pushOn
   (ne jamais présumer un abonnement actif) : écart 15 users
   notifications_push=true pour 2 abonnements réels en base, causé par
   un pushOn initialisé à true sans vérification du navigateur.
   ────────────────────────────────────────────────────────────────────────── */

async function resoudrePushOn(registration) {
  try {
    const sub = await registration?.pushManager.getSubscription()
    return !!sub
  } catch {
    return false
  }
}

describe('P1 — pushOn reflète l\'abonnement navigateur réel, jamais une présomption', () => {
  it('aucune registration de service worker -> false', async () => {
    expect(await resoudrePushOn(undefined)).toBe(false)
  })

  it('registration sans abonnement actif -> false (pas de présomption à true)', async () => {
    const reg = { pushManager: { getSubscription: vi.fn().mockResolvedValue(null) } }
    expect(await resoudrePushOn(reg)).toBe(false)
  })

  it('un abonnement push réel existe -> true', async () => {
    const reg = { pushManager: { getSubscription: vi.fn().mockResolvedValue({ endpoint: 'https://x' }) } }
    expect(await resoudrePushOn(reg)).toBe(true)
  })

  it('getSubscription() qui rejette -> false, ne casse pas (fail-safe)', async () => {
    const reg = { pushManager: { getSubscription: vi.fn().mockRejectedValue(new Error('boom')) } }
    expect(await resoudrePushOn(reg)).toBe(false)
  })
})
