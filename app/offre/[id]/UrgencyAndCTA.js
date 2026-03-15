'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'

function getTimeLeft(dateFin) {
  const diff = new Date(dateFin) - new Date()
  if (diff <= 0) return null
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return { h, m, s, diff }
}

export default function UrgencyAndCTA({ offre }) {
  const [timeLeft, setTimeLeft] = useState(null)
  const { user }  = useAuth()
  const router    = useRouter()
  const pathname  = usePathname()

  useEffect(() => {
    setTimeLeft(getTimeLeft(offre.date_fin))
    const timer = setInterval(() => setTimeLeft(getTimeLeft(offre.date_fin)), 1000)
    return () => clearInterval(timer)
  }, [offre.date_fin])

  const expired      = !timeLeft
  const epuise       = offre.nb_bons_restants <= 0
  const urgentTime   = timeLeft && timeLeft.diff < 30 * 60 * 1000
  const urgentStock  = offre.nb_bons_restants <= 5
  const urgent       = urgentTime || urgentStock
  const dejaReserves = (offre.nb_bons_total || 0) - (offre.nb_bons_restants || 0)

  function handleReserver() {
    if (!user) {
      // Redirige vers la page de connexion en mémorisant l'offre en cours
      router.push(`/connexion?next=${encodeURIComponent(pathname)}`)
      return
    }
    // TODO : logique de réservation (crée reservation, décrémente stock)
  }

  const ctaLabel = epuise || expired
    ? 'C\u2019est parti\u00a0!'
    : 'Réserver mon bon'

  return (
    <>
      {/* ── Barre d'urgence ─────────────────────────────────────────────── */}
      <div
        className={`flex items-center justify-between px-4 py-3 rounded-2xl ${urgent ? '' : 'bg-[#F5F5F5]'}`}
        style={urgent ? { backgroundColor: '#FF6B00', color: 'white' } : {}}
      >
        {/* Compte à rebours */}
        <div className="flex items-center gap-2">
          <span className="text-lg">⏱</span>
          {expired ? (
            <span className={`text-sm font-bold ${urgent ? 'text-white' : 'text-red-500'}`}>
              C&apos;est parti&nbsp;!
            </span>
          ) : (
            <span className={`text-base font-black tabular-nums tracking-tight ${urgent ? 'text-white' : 'text-[#0A0A0A]'}`}>
              {String(timeLeft.h).padStart(2, '0')}h {String(timeLeft.m).padStart(2, '0')}m {String(timeLeft.s).padStart(2, '0')}s
            </span>
          )}
        </div>

        {/* Bons restants */}
        <div className="text-right">
          <p className={`text-sm font-black ${urgent ? 'text-white' : offre.nb_bons_restants <= 5 ? 'text-red-500' : 'text-[#0A0A0A]'}`}>
            🎫 {offre.nb_bons_restants} restant{offre.nb_bons_restants > 1 ? 's' : ''}
          </p>
          {urgent && (
            <p className="text-[10px] text-white/80 font-semibold">
              {urgentTime && urgentStock
                ? 'Fin imminente !'
                : urgentTime
                ? 'Expire bientôt !'
                : 'Presque épuisé !'}
            </p>
          )}
        </div>
      </div>

      {/* ── CTA principal ───────────────────────────────────────────────── */}
      <button
        onClick={handleReserver}
        disabled={expired || epuise}
        className="w-full bg-[#FF6B00] hover:bg-[#CC5500] disabled:bg-[#D0D0D0] disabled:cursor-not-allowed text-white font-black text-lg py-4 rounded-2xl transition-colors duration-200 shadow-lg shadow-orange-200 min-h-[56px]"
      >
        {ctaLabel}
      </button>

      {/* ── Preuve sociale ──────────────────────────────────────────────── */}
      {dejaReserves > 0 && !expired && !epuise && (
        <p className="text-center text-xs text-[#3D3D3D]/60 font-medium">
          🔥 {dejaReserves} personne{dejaReserves > 1 ? 's ont' : ' a'} déjà réservé
        </p>
      )}

      {/* Invitation discrète à se connecter */}
      {!user && !expired && !epuise && (
        <p className="text-center text-[10px] text-[#3D3D3D]/40">
          Connecte-toi pour réserver ton bon
        </p>
      )}
    </>
  )
}
