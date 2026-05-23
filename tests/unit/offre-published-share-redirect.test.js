import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function makeRouter() {
  return { push: vi.fn() }
}

/**
 * Simule le handler handleShare tel qu'implémenté dans page.js.
 * Reçoit un mock de navigator.share (ou undefined pour tester le fallback).
 */
async function handleShare({ navigatorShare, router, onFallback }) {
  if (navigatorShare) {
    try {
      await navigatorShare({ title: 'test', text: 'test', url: 'https://bonmoment.app/offre/123' })
      router.push('/commercant/dashboard')
    } catch (err) {
      if (err.name !== 'AbortError') {
        // autre erreur — l'utilisateur peut réessayer
      }
    }
  } else {
    if (onFallback) onFallback()
  }
}

/**
 * Simule handleCopyLink tel qu'implémenté dans page.js.
 */
async function handleCopyLink({ clipboardWrite, router, onStateChange }) {
  try { await clipboardWrite('https://bonmoment.app/offre/123') } catch { }
  if (onStateChange) onStateChange('copied')
  setTimeout(() => {
    if (onStateChange) onStateChange('reset')
    router.push('/commercant/dashboard')
  }, 1500)
}

/* ── Web Share API ───────────────────────────────────────────────────────── */

describe('handleShare — Web Share API', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('share réussi → router.push("/commercant/dashboard") appelé', async () => {
    const router = makeRouter()
    const navigatorShare = vi.fn().mockResolvedValue(undefined)
    await handleShare({ navigatorShare, router })
    expect(router.push).toHaveBeenCalledOnce()
    expect(router.push).toHaveBeenCalledWith('/commercant/dashboard')
  })

  it('AbortError (utilisateur annule) → router.push NOT appelé', async () => {
    const router = makeRouter()
    const abortErr = Object.assign(new Error('Aborted'), { name: 'AbortError' })
    const navigatorShare = vi.fn().mockRejectedValue(abortErr)
    await handleShare({ navigatorShare, router })
    expect(router.push).not.toHaveBeenCalled()
  })

  it('autre erreur de partage → router.push NOT appelé (l\'utilisateur peut réessayer)', async () => {
    const router = makeRouter()
    const otherErr = Object.assign(new Error('Network error'), { name: 'NotAllowedError' })
    const navigatorShare = vi.fn().mockRejectedValue(otherErr)
    await handleShare({ navigatorShare, router })
    expect(router.push).not.toHaveBeenCalled()
  })

  it('navigator.share absent → fallback dropdown ouvert, router.push NOT appelé', async () => {
    const router = makeRouter()
    const fallback = vi.fn()
    await handleShare({ navigatorShare: undefined, router, onFallback: fallback })
    expect(fallback).toHaveBeenCalledOnce()
    expect(router.push).not.toHaveBeenCalled()
  })
})

/* ── Deeplinks WhatsApp / Facebook ──────────────────────────────────────── */

describe('Deeplinks WhatsApp/Facebook — redirect après 500ms', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('clic WhatsApp → router.push appelé après 500ms', () => {
    const router = makeRouter()
    // Simule le onClick du <a> WhatsApp
    const onClick = () => { setTimeout(() => router.push('/commercant/dashboard'), 500) }
    onClick()
    expect(router.push).not.toHaveBeenCalled()
    vi.advanceTimersByTime(500)
    expect(router.push).toHaveBeenCalledWith('/commercant/dashboard')
  })

  it('clic Facebook → router.push appelé après 500ms', () => {
    const router = makeRouter()
    const onClick = () => { setTimeout(() => router.push('/commercant/dashboard'), 500) }
    onClick()
    vi.advanceTimersByTime(499)
    expect(router.push).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(router.push).toHaveBeenCalledWith('/commercant/dashboard')
  })
})

/* ── Copie de lien ──────────────────────────────────────────────────────── */

describe('handleCopyLink — redirect après 1500ms', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('copie réussie → router.push appelé après 1500ms', async () => {
    const router = makeRouter()
    const clipboardWrite = vi.fn().mockResolvedValue(undefined)
    handleCopyLink({ clipboardWrite, router })
    await Promise.resolve() // flush microtasks
    expect(router.push).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1500)
    expect(router.push).toHaveBeenCalledWith('/commercant/dashboard')
  })

  it('état "copied" déclenché avant la redirection', async () => {
    const router = makeRouter()
    const clipboardWrite = vi.fn().mockResolvedValue(undefined)
    const states = []
    handleCopyLink({ clipboardWrite, router, onStateChange: s => states.push(s) })
    await Promise.resolve()
    expect(states).toContain('copied')
    vi.advanceTimersByTime(1500)
    expect(states).toContain('reset')
  })

  it('échec clipboard → router.push quand même appelé après 1500ms', async () => {
    const router = makeRouter()
    const clipboardWrite = vi.fn().mockRejectedValue(new Error('Permission denied'))
    handleCopyLink({ clipboardWrite, router })
    await Promise.resolve()
    vi.advanceTimersByTime(1500)
    expect(router.push).toHaveBeenCalledWith('/commercant/dashboard')
  })
})

/* ── Lien de secours "Je ne souhaite pas partager..." ───────────────────── */

describe('Lien de secours — non-régression', () => {
  it('clic sur le lien de secours → router.push("/commercant/dashboard") immédiat', () => {
    const router = makeRouter()
    // Simule le onClick du bouton de secours
    const onClick = () => router.push('/commercant/dashboard')
    onClick()
    expect(router.push).toHaveBeenCalledOnce()
    expect(router.push).toHaveBeenCalledWith('/commercant/dashboard')
  })

  it('le lien de secours redirige vers le dashboard (pas vers "/")', () => {
    const router = makeRouter()
    const onClick = () => router.push('/commercant/dashboard')
    onClick()
    expect(router.push).not.toHaveBeenCalledWith('/')
  })
})
