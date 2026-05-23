'use client'

import { useState, useRef, useEffect } from 'react'
import { Share2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getFullOffreTitle } from '@/lib/offreTitle'

const BASE_URL = 'https://bonmoment.app'

/**
 * Props:
 *   offre      — objet offre (id, titre, type_remise, valeur)
 *   commerce   — objet commerce (nom, ville)
 *   variant    — 'full' (gros CTA page post-publication) | 'icon' (icône discrète dashboard)
 *   redirectTo — route vers laquelle rediriger après partage (undefined → pas de redirect)
 */
export default function PartagerOffreButton({ offre, commerce, variant = 'icon', redirectTo }) {
  const router   = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied,   setCopied]   = useState(false)
  const menuRef = useRef(null)

  const shareUrl  = offre?.id ? `${BASE_URL}/offre/${offre.id}` : BASE_URL
  const fullTitre = getFullOffreTitle(offre) || offre?.titre || 'Offre'
  const shareTitle = `🎁 ${fullTitre} — ${commerce?.nom || 'BONMOMENT'}`
  const shareText  = `${fullTitre} chez ${commerce?.nom || 'ce commerce'} à ${commerce?.ville || 'ta ville'} 🎁 Réserve ton bon gratuit :`

  const encodedText = encodeURIComponent(`${shareText}\n${shareUrl}`)
  const encodedUrl  = encodeURIComponent(shareUrl)

  useEffect(() => {
    if (!menuOpen) return
    function onOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('touchstart', onOutside)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('touchstart', onOutside)
    }
  }, [menuOpen])

  function maybeRedirect() {
    if (redirectTo) router.push(redirectTo)
  }

  async function handleMainShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl })
        maybeRedirect()
      } catch (err) {
        if (err.name !== 'AbortError') setMenuOpen(true)
      }
      return
    }
    setMenuOpen(v => !v)
  }

  function handleSocialClick() {
    setMenuOpen(false)
    if (redirectTo) setTimeout(() => router.push(redirectTo), 500)
  }

  async function handleCopyLink() {
    try { await navigator.clipboard.writeText(shareUrl) } catch {}
    setCopied(true)
    setMenuOpen(false)
    if (redirectTo) {
      setTimeout(() => { setCopied(false); router.push(redirectTo) }, 1500)
    } else {
      setTimeout(() => setCopied(false), 2500)
    }
  }

  /* ── variant "icon" : icône Share2 discrète pour les cartes du dashboard ── */

  if (variant === 'icon') {
    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={handleMainShare}
          aria-label="Partager cette offre"
          className="flex items-center justify-center w-11 h-11 rounded-xl text-[#3D3D3D]/50 hover:text-[#FF6B00] hover:bg-[#FFF0E0] transition-colors"
        >
          <Share2 size={18} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 z-[55] bg-white rounded-2xl shadow-2xl border border-[#F0F0F0] py-1.5 w-48 flex flex-col">
            <a
              href={`https://wa.me/?text=${encodedText}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleSocialClick}
              className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#F5F5F5] transition-colors"
            >
              <span className="text-base">💬</span>
              <span className="text-sm font-semibold text-[#0A0A0A]">WhatsApp</span>
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleSocialClick}
              className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#F5F5F5] transition-colors"
            >
              <span className="text-base">📘</span>
              <span className="text-sm font-semibold text-[#0A0A0A]">Facebook</span>
            </a>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#F5F5F5] transition-colors text-left"
            >
              <span className="text-base">{copied ? '✅' : '🔗'}</span>
              <span className={`text-sm font-semibold ${copied ? 'text-green-600' : 'text-[#0A0A0A]'}`}>
                {copied ? 'Lien copié !' : 'Copier le lien'}
              </span>
            </button>
          </div>
        )}
      </div>
    )
  }

  /* ── variant "full" : gros CTA page post-publication ───────────────────── */

  return (
    <div className="relative flex flex-col items-center gap-3 w-full max-w-xs" ref={menuRef}>
      <button
        onClick={handleMainShare}
        className="w-full py-4 rounded-2xl bg-[#FF6B00] text-white font-black text-base shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-3"
      >
        <div className="flex items-center shrink-0" style={{ marginRight: '-4px' }}>
          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm" style={{ zIndex: 3 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm -ml-1.5" style={{ zIndex: 2 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>
          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm -ml-1.5" style={{ zIndex: 1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24">
              <defs>
                <linearGradient id="igGradPOB" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#FDB347"/>
                  <stop offset="30%"  stopColor="#F7627B"/>
                  <stop offset="65%"  stopColor="#C01F8A"/>
                  <stop offset="100%" stopColor="#7232BD"/>
                </linearGradient>
              </defs>
              <path fill="url(#igGradPOB)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </div>
        </div>
        Partager mon offre
      </button>

      {menuOpen && (
        <div className="absolute top-full mt-2 w-full bg-white border border-[#F0F0F0] rounded-2xl shadow-xl overflow-hidden z-10">
          <a
            href={`https://wa.me/?text=${encodedText}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleSocialClick}
            className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-[#0A0A0A] hover:bg-[#F5F5F5]"
          >
            <span className="text-lg">💬</span> WhatsApp
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleSocialClick}
            className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-[#0A0A0A] hover:bg-[#F5F5F5] border-t border-[#F0F0F0]"
          >
            <span className="text-lg">📘</span> Facebook
          </a>
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-[#0A0A0A] hover:bg-[#F5F5F5] border-t border-[#F0F0F0]"
          >
            <span className="text-lg">{copied ? '✅' : '🔗'}</span>
            {copied ? 'Lien copié !' : 'Copier le lien'}
          </button>
        </div>
      )}
    </div>
  )
}
