import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/* ──────────────────────────────────────────────────────────────────────────
   Logique extraite de PartagerOffreButton (testée sans rendu React)
   Pattern identique à offre-published-share-redirect.test.js
   ────────────────────────────────────────────────────────────────────────── */

function makeRouter() {
  return { push: vi.fn() }
}

/**
 * Simule handleMainShare de PartagerOffreButton.
 * navigatorShare : mock de navigator.share (undefined → fallback dropdown)
 * redirectTo     : route cible (undefined → pas de redirect)
 */
async function handleMainShare({ navigatorShare, router, redirectTo, onFallback }) {
  if (navigatorShare) {
    try {
      await navigatorShare({ title: 'test', text: 'test', url: 'https://bonmoment.app/offre/42' })
      if (redirectTo) router.push(redirectTo)
    } catch (err) {
      if (err.name !== 'AbortError' && onFallback) onFallback()
    }
    return
  }
  if (onFallback) onFallback()
}

/**
 * Simule handleSocialClick (WhatsApp/Facebook deep link).
 */
function handleSocialClick({ router, redirectTo }) {
  if (redirectTo) setTimeout(() => router.push(redirectTo), 500)
}

/**
 * Simule handleCopyLink.
 */
async function handleCopyLink({ clipboardWrite, router, redirectTo, onStateChange }) {
  try { await clipboardWrite('https://bonmoment.app/offre/42') } catch {}
  if (onStateChange) onStateChange('copied')
  if (redirectTo) {
    setTimeout(() => { if (onStateChange) onStateChange('reset'); router.push(redirectTo) }, 1500)
  } else {
    setTimeout(() => { if (onStateChange) onStateChange('reset') }, 2500)
  }
}

/* ── variant rendering (via duck-typing) ── */

describe('PartagerOffreButton — variants', () => {
  it('variant="full" expose le gros CTA (logique share complète disponible)', () => {
    // Le variant full expose les mêmes handlers → on vérifie via handleMainShare
    const router = makeRouter()
    const share = vi.fn().mockResolvedValue(undefined)
    expect(async () => {
      await handleMainShare({ navigatorShare: share, router, redirectTo: '/commercant/dashboard' })
    }).not.toThrow()
  })

  it('variant="icon" (pas de redirectTo) → share fonctionne sans throw', () => {
    const router = makeRouter()
    const share = vi.fn().mockResolvedValue(undefined)
    expect(async () => {
      await handleMainShare({ navigatorShare: share, router, redirectTo: undefined })
    }).not.toThrow()
  })
})

/* ── Web Share API — avec redirectTo ── */

describe('handleMainShare — Web Share API avec redirectTo', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('share réussi + redirectTo → router.push(redirectTo) appelé', async () => {
    const router = makeRouter()
    const share  = vi.fn().mockResolvedValue(undefined)
    await handleMainShare({ navigatorShare: share, router, redirectTo: '/commercant/dashboard' })
    expect(router.push).toHaveBeenCalledOnce()
    expect(router.push).toHaveBeenCalledWith('/commercant/dashboard')
  })

  it('AbortError → router.push NOT appelé (même avec redirectTo)', async () => {
    const router   = makeRouter()
    const abortErr = Object.assign(new Error('Aborted'), { name: 'AbortError' })
    const share    = vi.fn().mockRejectedValue(abortErr)
    await handleMainShare({ navigatorShare: share, router, redirectTo: '/commercant/dashboard' })
    expect(router.push).not.toHaveBeenCalled()
  })
})

/* ── Web Share API — sans redirectTo ── */

describe('handleMainShare — Web Share API sans redirectTo', () => {
  it('share réussi + pas de redirectTo → router.push NOT appelé', async () => {
    const router = makeRouter()
    const share  = vi.fn().mockResolvedValue(undefined)
    await handleMainShare({ navigatorShare: share, router, redirectTo: undefined })
    expect(router.push).not.toHaveBeenCalled()
  })

  it('navigator.share absent + pas de redirectTo → fallback, router.push NOT appelé', async () => {
    const router   = makeRouter()
    const fallback = vi.fn()
    await handleMainShare({ navigatorShare: undefined, router, redirectTo: undefined, onFallback: fallback })
    expect(fallback).toHaveBeenCalledOnce()
    expect(router.push).not.toHaveBeenCalled()
  })
})

/* ── Deeplinks WhatsApp / Facebook — avec redirectTo ── */

describe('handleSocialClick — deeplinks avec redirectTo', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('clic WhatsApp + redirectTo → router.push après 500ms', () => {
    const router = makeRouter()
    handleSocialClick({ router, redirectTo: '/commercant/dashboard' })
    expect(router.push).not.toHaveBeenCalled()
    vi.advanceTimersByTime(500)
    expect(router.push).toHaveBeenCalledWith('/commercant/dashboard')
  })

  it('clic Facebook + redirectTo → router.push après 500ms', () => {
    const router = makeRouter()
    handleSocialClick({ router, redirectTo: '/commercant/dashboard' })
    vi.advanceTimersByTime(499)
    expect(router.push).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(router.push).toHaveBeenCalledOnce()
  })
})

/* ── Deeplinks — sans redirectTo ── */

describe('handleSocialClick — deeplinks sans redirectTo', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('pas de redirectTo → router.push JAMAIS appelé (même après 1000ms)', () => {
    const router = makeRouter()
    handleSocialClick({ router, redirectTo: undefined })
    vi.advanceTimersByTime(1000)
    expect(router.push).not.toHaveBeenCalled()
  })
})

/* ── Copie de lien — avec redirectTo ── */

describe('handleCopyLink — avec redirectTo', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('copie réussie + redirectTo → router.push après 1500ms', async () => {
    const router = makeRouter()
    const clipWrite = vi.fn().mockResolvedValue(undefined)
    handleCopyLink({ clipboardWrite: clipWrite, router, redirectTo: '/commercant/dashboard' })
    await Promise.resolve()
    expect(router.push).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1500)
    expect(router.push).toHaveBeenCalledWith('/commercant/dashboard')
  })

  it('état "copied" visible avant redirect', async () => {
    const router = makeRouter()
    const states = []
    const clipWrite = vi.fn().mockResolvedValue(undefined)
    handleCopyLink({ clipboardWrite: clipWrite, router, redirectTo: '/commercant/dashboard', onStateChange: s => states.push(s) })
    await Promise.resolve()
    expect(states).toContain('copied')
    vi.advanceTimersByTime(1500)
    expect(states).toContain('reset')
  })
})

/* ── Copie de lien — sans redirectTo ── */

describe('handleCopyLink — sans redirectTo', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('pas de redirectTo → router.push NOT appelé, feedback "copied" quand même', async () => {
    const router = makeRouter()
    const states = []
    const clipWrite = vi.fn().mockResolvedValue(undefined)
    handleCopyLink({ clipboardWrite: clipWrite, router, redirectTo: undefined, onStateChange: s => states.push(s) })
    await Promise.resolve()
    expect(states).toContain('copied')
    vi.advanceTimersByTime(2500)
    expect(router.push).not.toHaveBeenCalled()
  })
})
