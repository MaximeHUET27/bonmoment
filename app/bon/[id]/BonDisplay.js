'use client'

/**
 * Affichage du bon en mode page standalone (pas d'overlay).
 * Identique visuellement à FullScreenBon mais sans fixed inset-0.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { formatDebut } from '@/lib/offreStatus'
import { getFullOffreTitle } from '@/lib/offreTitle'
import CommerceInfoCard from '@/app/components/CommerceInfoCard'
import { useAuth } from '@/app/context/AuthContext'

const QRCodeSVG = dynamic(
  () => import('qrcode.react').then(m => m.QRCodeSVG),
  {
    ssr: false,
    loading: () => (
      <div className="w-[250px] h-[250px] bg-[#F5F5F5] rounded-2xl animate-pulse flex items-center justify-center">
        <span className="w-8 h-8 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  }
)

function calcTimeLeft(dateFin) {
  const diff = new Date(dateFin) - new Date()
  if (diff <= 0) return null
  return { h: Math.floor(diff / 3_600_000), m: Math.floor((diff % 3_600_000) / 60_000), s: Math.floor((diff % 60_000) / 1_000), diff }
}

function useCountdown(dateFin) {
  const [tl, setTl] = useState(() => calcTimeLeft(dateFin))
  useEffect(() => {
    const t = setInterval(() => setTl(calcTimeLeft(dateFin)), 1_000)
    return () => clearInterval(t)
  }, [dateFin])
  return tl
}

function formatCode(code) {
  const s = String(code ?? '000000').padStart(6, '0')
  return `${s[0]} ${s[1]} ${s[2]}  ${s[3]} ${s[4]} ${s[5]}`
}

function formatBadge(offre) {
  if (!offre) return 'Offre'
  if (offre.type_remise === 'pourcentage')    return `−${offre.valeur}%`
  if (offre.type_remise === 'montant_fixe')   return `−${offre.valeur}€`
  if (offre.type_remise === 'montant')        return `−${offre.valeur}€`
  if (offre.type_remise === 'cadeau')         return '🎁 Cadeau'
  if (offre.type_remise === 'produit_offert') return '📦 Offert'
  if (offre.type_remise === 'service_offert') return '✂️ Offert'
  if (offre.type_remise === 'concours')       return '🎰 Concours'
  if (offre.type_remise === 'atelier')        return '🎉 Évènement'
  if (offre.type_remise === 'fidelite')       return '⭐ Fidélité'
  return 'Offre'
}

/* ── Overlay de review ─────────────────────────────────────────────────────── */

function ReviewOverlay({ reservationId, commerceId, commerceNom, placeId, onClose }) {
  const [step,        setStep]        = useState('stars')  // 'stars' | 'google' | 'feedback'
  const [note,        setNote]        = useState(0)
  const [hover,       setHover]       = useState(0)
  const [commentaire, setCommentaire] = useState('')
  const [sending,     setSending]     = useState(false)
  const [toast,       setToast]       = useState(false)

  const handleStarClick = useCallback(async (n) => {
    setNote(n)
    if (n >= 4) {
      setStep('google')
    } else {
      setStep('feedback')
    }
  }, [])

  const handleGoogleClick = useCallback(async () => {
    try {
      await fetch('/api/avis-google', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ reservation_id: reservationId, commerce_id: commerceId, note, source: 'bon' }),
      })
    } catch {}
    window.open(`https://search.google.com/local/writereview?placeid=${placeId}`, '_blank', 'noopener')
    onClose()
  }, [reservationId, commerceId, note, placeId, onClose])

  const handleFeedbackSend = useCallback(async () => {
    setSending(true)
    try {
      await fetch('/api/feedback-commerce', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ reservation_id: reservationId, commerce_id: commerceId, note, commentaire, source: 'bon' }),
      })
    } catch {}
    setSending(false)
    setToast(true)
    setTimeout(onClose, 1800)
  }, [reservationId, commerceId, note, commentaire, onClose])

  const activeStars  = hover || note
  const starStyle = (i) => ({
    fontSize: '40px',
    cursor: 'pointer',
    color: i <= activeStars ? '#FF6B00' : '#D1D5DB',
    transition: 'color 0.1s',
    lineHeight: 1,
    userSelect: 'none',
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
      style={{ animation: 'fadeInOverlay 0.35s ease forwards' }}
    >
      <style>{`
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUpCard {
          from { transform: translateY(24px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .review-card { animation: slideUpCard 0.35s ease forwards; }
      `}</style>

      <div className="review-card bg-white rounded-3xl px-6 py-8 w-full max-w-sm flex flex-col items-center gap-5 shadow-2xl">

        {/* ── Étape : étoiles ─────────────────────────────────────────────── */}
        {step === 'stars' && (
          <>
            <p className="text-base font-black text-[#0A0A0A] text-center leading-snug">
              ✅ Bon validé !
            </p>
            <p className="text-sm text-[#3D3D3D] text-center leading-relaxed">
              Toi aussi, rend service à ton commerçant&nbsp;:
            </p>
            <p className="text-base font-bold text-[#0A0A0A] text-center leading-snug">
              Comment s&apos;est passée ton expérience chez&nbsp;<span className="text-[#FF6B00]">{commerceNom}</span>&nbsp;?
            </p>
            <div className="flex gap-3" role="group" aria-label="Note">
              {[1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  onClick={() => handleStarClick(i)}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(0)}
                  style={starStyle(i)}
                  aria-label={`${i} étoile${i > 1 ? 's' : ''}`}
                >
                  {i <= activeStars ? '★' : '☆'}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Plus tard
            </button>
          </>
        )}

        {/* ── Étape : redirection Google ──────────────────────────────────── */}
        {step === 'google' && (
          <>
            <p className="text-2xl">🎉</p>
            <p className="text-lg font-black text-[#0A0A0A] text-center">Merci !</p>
            <p className="text-sm text-[#3D3D3D] text-center leading-relaxed">
              Aide <span className="font-bold">{commerceNom}</span> en partageant ton expérience sur Google&nbsp;:
            </p>
            <button
              onClick={handleGoogleClick}
              className="w-full bg-[#FF6B00] hover:bg-[#CC5500] text-white font-bold text-base py-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
            >
              ⭐ Laisser un avis Google
            </button>
            <button
              onClick={onClose}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Plus tard
            </button>
          </>
        )}

        {/* ── Étape : feedback privé ──────────────────────────────────────── */}
        {step === 'feedback' && (
          <>
            <p className="text-lg font-black text-[#0A0A0A] text-center">Merci pour ton retour 🙏</p>
            <p className="text-sm text-[#3D3D3D] text-center leading-relaxed">
              Aide <span className="font-bold">{commerceNom}</span> à s&apos;améliorer&nbsp;:
            </p>
            <textarea
              value={commentaire}
              onChange={e => setCommentaire(e.target.value)}
              rows={3}
              placeholder="Qu'est-ce qui pourrait être amélioré ?"
              className="w-full border border-[#E0E0E0] rounded-2xl px-4 py-3 text-sm text-[#0A0A0A] resize-none outline-none focus:border-[#FF6B00] transition-colors"
            />
            {toast ? (
              <div className="w-full text-center text-sm font-bold text-green-600 py-2">
                Merci, ton avis a été transmis !
              </div>
            ) : (
              <button
                onClick={handleFeedbackSend}
                disabled={sending}
                className="w-full bg-[#FF6B00] hover:bg-[#CC5500] disabled:opacity-60 text-white font-bold text-base py-4 rounded-2xl transition-colors"
              >
                {sending ? 'Envoi…' : 'Envoyer mon avis'}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Passer
            </button>
          </>
        )}

      </div>
    </div>
  )
}

/* ── Composant principal ─────────────────────────────────────────────────── */

export default function BonDisplay({ reservation, offre, commerce, commerceId, placeId }) {
  const { user, supabase } = useAuth()
  const timeLeft = useCountdown(offre?.date_fin)
  const wakeLock = useRef(null)
  const [entered,     setEntered]     = useState(false)
  const [showReview,  setShowReview]  = useState(false)
  const prevStatutRef = useRef(reservation?.statut)

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 30)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    async function acquire() {
      try {
        if ('wakeLock' in navigator)
          wakeLock.current = await navigator.wakeLock.request('screen')
      } catch {}
    }
    acquire()
    return () => { wakeLock.current?.release().catch(() => {}) }
  }, [])

  /* ── Polling pour détecter la validation ──────────────────────────────── */
  useEffect(() => {
    const hasValidPlace = placeId && !placeId.startsWith('test_')
    if (!hasValidPlace || !commerceId || !reservation?.id || !user || !supabase) return
    if (reservation?.statut === 'utilisee') return // déjà validé au chargement

    const sessionKey = `avis_demande_${commerceId}`
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(sessionKey)) return

    let stopped = false

    async function pollStatut() {
      try {
        const res = await fetch(`/api/bon-statut/${reservation.id}`)
        if (!res.ok) return
        const { statut } = await res.json()
        if (statut === 'utilisee' && prevStatutRef.current !== 'utilisee') {
          prevStatutRef.current = 'utilisee'
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(sessionKey, '1')
          }
          clearInterval(interval)
          // Vérification dédup (user_id, commerce_id) avant d'afficher
          const [{ data: avis }, { data: fb }] = await Promise.all([
            supabase.from('avis_google_clics').select('id').eq('user_id', user.id).eq('commerce_id', commerceId).limit(1),
            supabase.from('feedbacks_commerce').select('id').eq('user_id', user.id).eq('commerce_id', commerceId).limit(1),
          ])
          if ((avis?.length ?? 0) + (fb?.length ?? 0) > 0) return
          setTimeout(() => {
            if (!stopped) setShowReview(true)
          }, 2000)
        }
      } catch {}
    }

    const interval = setInterval(pollStatut, 3000)
    return () => {
      stopped = true
      clearInterval(interval)
    }
  }, [reservation?.id, reservation?.statut, placeId, commerceId, user, supabase])

  const qrUrl      = reservation?.qr_code_data || `${typeof window !== 'undefined' ? window.location.href : ''}`
  const programmee = offre?.date_debut && new Date(offre.date_debut) > new Date()
  const timerRed   = !programmee && timeLeft && timeLeft.diff < 1_800_000
  const expired    = !timeLeft

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-10">
      <div className="flex flex-col items-center gap-6 max-w-sm w-full">

        {/* Commerce + titre */}
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF6B00]">BONMOMENT</p>
          <p className="text-lg font-black text-[#0A0A0A] mt-1">{commerce?.nom}</p>
          <span className="inline-block mt-1 mb-0.5 px-2.5 py-0.5 rounded-full bg-[#FFF0E0] text-[#FF6B00] text-xs font-black">
            {formatBadge(offre)}
          </span>
          <p className="text-sm text-[#3D3D3D]/60 mt-0.5">{getFullOffreTitle(offre)}</p>
        </div>

        {/* Statut */}
        {reservation?.statut === 'utilisee' && (
          <div className="bg-green-100 text-green-700 font-bold text-sm px-4 py-2 rounded-full">
            ✓ Bon validé
          </div>
        )}

        {/* QR Code */}
        <div
          className="transition-all duration-500 ease-out"
          style={{ transform: entered ? 'scale(1)' : 'scale(0.8)', opacity: entered ? 1 : 0 }}
        >
          <div className="p-4 bg-white rounded-3xl shadow-2xl border border-[#F0F0F0]">
            <QRCodeSVG value={qrUrl} size={250} bgColor="#FFFFFF" fgColor="#0A0A0A" level="M" />
          </div>
        </div>

        {/* Code 6 chiffres */}
        <div className="text-center">
          <p
            className="text-[32px] text-[#0A0A0A] tracking-[0.2em] leading-none select-all"
            style={{ fontFamily: 'Courier New, monospace' }}
          >
            {formatCode(reservation?.code_validation)}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#3D3D3D]/40 mt-2">
            Code de validation
          </p>
        </div>

        <div className="w-full border-t border-[#F0F0F0]" />

        {/* Timer */}
        <div className="text-center">
          {programmee ? (
            <>
              <p className="text-xl font-black text-[#FF6B00]">📅 Valable à partir du</p>
              <p className="text-base font-bold text-[#FF6B00] mt-1">{formatDebut(offre.date_debut)}</p>
              <p className="text-[11px] text-[#FF6B00]/70 mt-1 font-medium">Ce bon n&apos;est pas encore actif</p>
            </>
          ) : expired ? (
            <p className="text-base font-black text-red-500">Trop tard — bon expiré</p>
          ) : (
            <>
              <p className={`text-2xl font-black tabular-nums tracking-tight ${timerRed ? 'text-red-500' : 'text-[#0A0A0A]'}`}>
                {String(timeLeft.h).padStart(2, '0')}h {String(timeLeft.m).padStart(2, '0')}m {String(timeLeft.s).padStart(2, '0')}s
              </p>
              <p className="text-[11px] text-[#3D3D3D]/50 mt-1 font-medium">
                {timerRed ? '⚠ Présente ce bon rapidement !' : 'Présente ce bon avant expiration'}
              </p>
            </>
          )}
        </div>

        <CommerceInfoCard commerce={commerce} commerceId={commerce?.id} />

      </div>

      {/* ── Overlay de review ─────────────────────────────────────────────── */}
      {showReview && (
        <ReviewOverlay
          reservationId={reservation.id}
          commerceId={commerceId}
          commerceNom={commerce?.nom}
          placeId={placeId}
          onClose={() => setShowReview(false)}
        />
      )}
    </main>
  )
}
