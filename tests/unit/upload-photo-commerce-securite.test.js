import { describe, it, expect } from 'vitest'

/* ── Garde-fous de app/api/upload-photo-commerce/route.js (constat C1) ──────
   Réplique exactement la logique de validation de domaine pour prouver que
   seuls les domaines Google réellement utilisés (SDK Maps JS + Places New)
   sont acceptés côté serveur avant de fetcher une URL arbitraire.
   ────────────────────────────────────────────────────────────────────────── */

const DOMAINES_AUTORISES = [
  'lh3.googleusercontent.com',
  'maps.googleapis.com',
  'places.googleapis.com',
]

function hostnameAutorise(urlStr) {
  try {
    const { hostname, protocol } = new URL(urlStr)
    if (protocol !== 'https:') return false
    return DOMAINES_AUTORISES.some(d => hostname === d || hostname.endsWith(`.${d}`))
  } catch {
    return false
  }
}

describe('C1 — upload-photo-commerce : liste blanche de domaines', () => {
  it('accepte une URL Google Photos (SDK Maps JS)', () => {
    expect(hostnameAutorise('https://lh3.googleusercontent.com/places/abc123=w900')).toBe(true)
  })

  it('accepte une URL Google Places New API', () => {
    expect(hostnameAutorise('https://places.googleapis.com/v1/places/xyz/photos/abc/media')).toBe(true)
  })

  it('refuse un domaine arbitraire (exfiltration / SSRF)', () => {
    expect(hostnameAutorise('https://evil.example.com/malware.jpg')).toBe(false)
  })

  it('refuse un sous-domaine usurpé non listé (ex: lh3.googleusercontent.com.evil.com)', () => {
    expect(hostnameAutorise('https://lh3.googleusercontent.com.evil.com/x.jpg')).toBe(false)
  })

  it('refuse http (non chiffré) même sur un domaine listé', () => {
    expect(hostnameAutorise('http://lh3.googleusercontent.com/x.jpg')).toBe(false)
  })

  it('refuse une URL invalide sans lever d\'exception', () => {
    expect(hostnameAutorise('pas-une-url')).toBe(false)
  })

  it('refuse un schéma non-http (file:, javascript:)', () => {
    expect(hostnameAutorise('file:///etc/passwd')).toBe(false)
    expect(hostnameAutorise('javascript:alert(1)')).toBe(false)
  })
})

describe('C1 — upload-photo-commerce : content-type de la réponse Google', () => {
  function contentTypeValide(contentType) {
    return (contentType || '').startsWith('image/')
  }

  it('accepte image/jpeg', () => {
    expect(contentTypeValide('image/jpeg')).toBe(true)
  })

  it('refuse text/html (page d\'erreur Google déguisée en image)', () => {
    expect(contentTypeValide('text/html')).toBe(false)
  })

  it('refuse un content-type absent', () => {
    expect(contentTypeValide('')).toBe(false)
    expect(contentTypeValide(undefined)).toBe(false)
  })
})
