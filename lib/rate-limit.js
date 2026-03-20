/**
 * Rate limiter en mémoire (Map IP → compteur).
 * Nettoyage automatique des entrées expirées toutes les 5 minutes.
 */

const CLEANUP_INTERVAL = 5 * 60 * 1000

const stores = new Map()
let cleanupTimer = null

function ensureCleanup() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const store of stores.values()) {
      for (const [ip, entry] of store) {
        if (now > entry.resetAt) store.delete(ip)
      }
    }
  }, CLEANUP_INTERVAL)
  if (cleanupTimer.unref) cleanupTimer.unref()
}

export function rateLimit({ maxRequests, windowMs }) {
  const key = `${maxRequests}:${windowMs}`
  if (!stores.has(key)) stores.set(key, new Map())
  const store = stores.get(key)
  ensureCleanup()

  return function check(request) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const now = Date.now()
    const entry = store.get(ip)

    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs })
      return null
    }

    entry.count++
    if (entry.count > maxRequests) {
      return new Response(
        JSON.stringify({ error: 'Trop de tentatives, réessaie dans quelques minutes.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return null
  }
}
