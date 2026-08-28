// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { compressImage } from '@/lib/imageCompress'

/* ── Chaîne de repli photo — logique de OffreCard.js (7A) ──────────────────
   const photoAffichee = offre?.photo_url || commerce?.photo_url || null
   ────────────────────────────────────────────────────────────────────────── */

function photoAffichee(offre, commerce) {
  return offre?.photo_url || commerce?.photo_url || null
}

describe('Chaîne de repli photo offre → commerce → secours', () => {
  it('offre.photo_url renseignée → c\'est elle qui est affichée', () => {
    const offre    = { photo_url: 'https://x.supabase.co/offre.jpg' }
    const commerce = { photo_url: 'https://x.supabase.co/commerce.jpg' }
    expect(photoAffichee(offre, commerce)).toBe('https://x.supabase.co/offre.jpg')
  })

  it('offre.photo_url null + commerce.photo_url renseignée → photo du commerce', () => {
    const offre    = { photo_url: null }
    const commerce = { photo_url: 'https://x.supabase.co/commerce.jpg' }
    expect(photoAffichee(offre, commerce)).toBe('https://x.supabase.co/commerce.jpg')
  })

  it('les deux null → null (bloc de secours 🏪 affiché)', () => {
    const offre    = { photo_url: null }
    const commerce = { photo_url: null }
    expect(photoAffichee(offre, commerce)).toBeNull()
  })

  it('commerce absent + offre sans photo → null (bloc de secours 🏪 affiché)', () => {
    expect(photoAffichee({ photo_url: null }, undefined)).toBeNull()
  })
})

/* ── compressImage — sortie JPEG obligatoire (jamais WebP) ─────────────────── */

describe('compressImage', () => {
  beforeEach(() => {
    global.createImageBitmap = vi.fn().mockResolvedValue({ width: 2000, height: 1000, close: vi.fn() })
    window.HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    })
    window.HTMLCanvasElement.prototype.toBlob = function (cb, type) {
      cb(new Blob(['fake-jpeg-bytes'], { type }))
    }
  })

  it('renvoie un Blob de type image/jpeg (jamais WebP)', async () => {
    const file = new File(['data'], 'photo.png', { type: 'image/png' })
    const blob = await compressImage(file)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('image/jpeg')
    expect(blob.type).not.toBe('image/webp')
  })

  it('appelle toBlob avec le type "image/jpeg" explicitement, quel que soit le fichier source', async () => {
    const toBlobSpy = vi.spyOn(window.HTMLCanvasElement.prototype, 'toBlob')
    const file = new File(['data'], 'photo.webp', { type: 'image/webp' })
    await compressImage(file)
    expect(toBlobSpy).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', expect.any(Number))
  })

  it('rejette si toBlob échoue (permet au caller de publier sans photo — 7D)', async () => {
    window.HTMLCanvasElement.prototype.toBlob = function (cb) { cb(null) }
    const file = new File(['data'], 'photo.png', { type: 'image/png' })
    await expect(compressImage(file)).rejects.toThrow()
  })
})

/* ── Garde-fou API : photo_url doit être https, sinon null (étape 4) ────────
   Réplique la logique exacte de app/api/offres/route.js
   ────────────────────────────────────────────────────────────────────────── */

function sanitizePhotoUrl(photo_url) {
  return typeof photo_url === 'string' && photo_url.startsWith('https://')
    ? photo_url
    : null
}

describe('API offres — garde-fou photo_url (pas de valeur arbitraire insérée)', () => {
  it('URL https valide → conservée', () => {
    expect(sanitizePhotoUrl('https://x.supabase.co/offres-photos/abc.jpg')).toBe('https://x.supabase.co/offres-photos/abc.jpg')
  })

  it('URL http (non sécurisée) → null', () => {
    expect(sanitizePhotoUrl('http://x.supabase.co/abc.jpg')).toBeNull()
  })

  it('javascript: ou autre valeur arbitraire → null', () => {
    expect(sanitizePhotoUrl('javascript:alert(1)')).toBeNull()
  })

  it('undefined (aucune photo envoyée) → null', () => {
    expect(sanitizePhotoUrl(undefined)).toBeNull()
  })

  it('valeur non-string (objet, nombre) → null', () => {
    expect(sanitizePhotoUrl({ toString: () => 'https://evil.com' })).toBeNull()
    expect(sanitizePhotoUrl(42)).toBeNull()
  })
})
