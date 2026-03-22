'use client'

import { useState, useRef, useEffect } from 'react'

const BASE_URL = 'https://bonmoment.app'

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function formatBadge(offre) {
  if (!offre) return 'Offre'
  if (offre.type_remise === 'pourcentage')    return `−${offre.valeur}%`
  if (offre.type_remise === 'montant_fixe')   return `−${offre.valeur}€`
  if (offre.type_remise === 'cadeau')         return '🎁 Cadeau'
  if (offre.type_remise === 'produit_offert') return '📦 Offert'
  if (offre.type_remise === 'service_offert') return '✂️ Offert'
  if (offre.type_remise === 'concours')       return '🎰 Concours'
  if (offre.type_remise === 'atelier')        return '🎨 Atelier'
  return 'Offre'
}

function buildShareContent(offre, commerce) {
  const nom   = commerce?.nom   || 'ce commerce'
  const ville = commerce?.ville || 'ta ville'
  const titre = offre?.titre    || ''
  const nb    = offre?.nb_bons_restants
  const url   = `${BASE_URL}/offre/${offre?.id}`

  let action = ''
  switch (offre?.type_remise) {
    case 'pourcentage':    action = `propose -${offre.valeur}%`;  break
    case 'montant_fixe':   action = `offre -${offre.valeur}€`;    break
    case 'cadeau':         action = 'offre un cadeau';             break
    case 'produit_offert': action = 'offre un produit';            break
    case 'service_offert': action = 'offre un service';            break
    case 'concours':       action = 'lance un concours';           break
    case 'atelier':        action = 'propose un atelier';          break
    default:               action = 'a une offre spéciale'
  }

  const badge  = formatBadge(offre)
  const nbText = nb && nb !== 9999 ? ` Il reste ${nb} bons — dépêche-toi !` : ''

  return {
    title: `${badge} chez ${nom} — BONMOMENT`,
    text:  `🔥 Bon plan à ${ville} ! ${nom} ${action} : "${titre}".${nbText}`,
    url,
  }
}

/* ── Icône partage SVG ───────────────────────────────────────────────────── */

function ShareIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16,6 12,2 8,6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}

/* ── Composant principal ─────────────────────────────────────────────────── */

/**
 * Props:
 *   offre        — objet offre (pour calculer le texte)
 *   commerce     — objet commerce (nom, ville)
 *   shareTitle   — override titre (optionnel)
 *   shareText    — override texte (optionnel)
 *   shareUrl     — override URL (optionnel)
 *   label        — libellé bouton texte (si fourni, affiche texte + icône)
 *   className    — classes supplémentaires
 */
export default function ShareButton({
  offre,
  commerce,
  shareTitle,
  shareText,
  shareUrl,
  label,
  className = '',
}) {
  const [showMenu, setShowMenu] = useState(false)
  const [copied,   setCopied]   = useState(false)
  const menuRef = useRef(null)

  const computed = buildShareContent(offre, commerce)
  const title = shareTitle ?? computed.title
  const text  = shareText  ?? computed.text
  const url   = shareUrl   ?? computed.url

  const encodedText  = encodeURIComponent(`${text}\n${url}`)
  const encodedTitle = encodeURIComponent(title)
  const encodedUrl   = encodeURIComponent(url)

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!showMenu) return
    function outside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false)
    }
    document.addEventListener('mousedown', outside)
    document.addEventListener('touchstart', outside)
    return () => {
      document.removeEventListener('mousedown', outside)
      document.removeEventListener('touchstart', outside)
    }
  }, [showMenu])

  async function handleShare(e) {
    e.stopPropagation()
    e.preventDefault()
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title, text, url }) } catch {}
      return
    }
    setShowMenu(v => !v)
  }

  async function handleCopy(e) {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {}
    setShowMenu(false)
  }

  return (
    <div className={`relative ${className}`} ref={menuRef}>

      {/* ── Bouton ── */}
      {label ? (
        <button
          type="button"
          onClick={handleShare}
          aria-label="Partager"
          className="flex items-center gap-2 text-sm font-bold text-[#FF6B00] border-2 border-[#FF6B00] hover:bg-[#FFF0E0] px-4 py-2.5 rounded-2xl transition-colors min-h-[44px]"
        >
          <ShareIcon size={16} />
          {label}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleShare}
          aria-label="Partager"
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[#FFF0E0] text-[#FF6B00] hover:bg-[#FF6B00] hover:text-white active:bg-[#CC5500] transition-colors shrink-0"
        >
          <ShareIcon />
        </button>
      )}

      {/* ── Dropdown fallback desktop ── */}
      {showMenu && (
        <div
          className="absolute right-0 top-full mt-1 z-[55] bg-white rounded-2xl shadow-2xl border border-[#F0F0F0] py-1.5 w-48 flex flex-col"
          style={{ animation: 'shareDropIn 0.15s ease' }}
        >
          <style>{`
            @keyframes shareDropIn {
              from { opacity: 0; transform: scale(0.95) translateY(-4px); }
              to   { opacity: 1; transform: scale(1)    translateY(0);    }
            }
          `}</style>

          <DropItem
            href={`https://wa.me/?text=${encodedText}`}
            icon="💬" label="WhatsApp"
            onClose={() => setShowMenu(false)}
          />
          <DropItem
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
            icon="👥" label="Facebook"
            onClose={() => setShowMenu(false)}
          />
          <DropItem
            href={`mailto:?subject=${encodedTitle}&body=${encodedText}`}
            icon="📧" label="Email"
            onClose={() => setShowMenu(false)}
          />

          <button
            onClick={handleCopy}
            className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#F5F5F5] transition-colors text-left"
          >
            <span className="text-base">{copied ? '✅' : '🔗'}</span>
            <span className={`text-sm font-semibold ${copied ? 'text-green-600' : 'text-[#0A0A0A]'}`}>
              {copied ? 'Lien copié !' : 'Copier le lien'}
            </span>
          </button>
        </div>
      )}

      {/* ── Toast copié ── */}
      {copied && !showMenu && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] bg-[#0A0A0A] text-white text-sm font-semibold px-4 py-2.5 rounded-2xl shadow-xl whitespace-nowrap pointer-events-none">
          🔗 Lien copié !
        </div>
      )}

    </div>
  )
}

function DropItem({ href, icon, label, onClose }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClose}
      className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#F5F5F5] transition-colors"
    >
      <span className="text-base">{icon}</span>
      <span className="text-sm font-semibold text-[#0A0A0A]">{label}</span>
    </a>
  )
}
