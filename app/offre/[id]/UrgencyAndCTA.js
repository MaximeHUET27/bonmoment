'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import SignInPanel from '@/app/components/SignInPanel'

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
  const [showAuth, setShowAuth]  = useState(false)
  const { user } = useAuth()
  const pathname = usePathname()

  useEffect(() => {
    setTimeLeft(getTimeLeft(offre.date_fin))
    const timer = setInterval(() => setTimeLeft(getTimeLeft(offre.date_fin)), 1000)
    return () => clearInterval(timer)
  }, [offre.date_fin])

  const expired      = !timeLeft
  const epuise       = offre.nb_bons_restants <= 0
  const urgentTime   = timeLeft && timeLeft.diff < 30 * 60 * 1000   // < 30 min
  const urgentStock  = offre.nb_bons_restants <= 5
  const urgent       = urgentTime || urgentStock
  const dejaReserves = (offre.nb_bons_total || 0) - (offre.nb_bons_restants || 0)

  function handleReserver() {
    if (!user) { setShowAuth(true); return }
    // TODO : logique de réservation (décrémente nb_bons_restants, crée reservation)
  }

  return (
    <>
      {/* Barre d'urgence */}
      <div
        className={`flex items-center justify-between px-4 py-3 rounded-2xl ${urgent ? 'animate-pulse-orange' : 'bg-[#F5F5F5]'}`}
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
              {urgentTime && urgentStock ? 'Fin imminente !' : urgentTime ? 'Expire bientôt !' : 'Presque épuisé !'}
            </p>
          )}
        </div>
      </div>

      {/* CTA principal */}
      <button
        onClick={handleReserver}
        disabled={expired || epuise}
        className="w-full bg-[#FF6B00] hover:bg-[#CC5500] disabled:bg-[#ccc] text-white font-black text-lg py-4 rounded-2xl transition-colors duration-200 shadow-lg shadow-orange-200 min-h-[56px]"
      >
        {epuise ? "C\u2019est parti\u00a0!" : expired ? "C\u2019est parti\u00a0!" : 'Réserver mon bon'}
      </button>

      {/* Preuve sociale */}
      {dejaReserves > 0 && !expired && !epuise && (
        <p className="text-center text-xs text-[#3D3D3D]/60 font-medium">
          🔥 {dejaReserves} personne{dejaReserves > 1 ? 's ont' : ' a'} déjà réservé
        </p>
      )}

      {/* Invitation à se connecter */}
      {!user && !expired && !epuise && (
        <p className="text-center text-[10px] text-[#3D3D3D]/40">
          Connecte-toi pour réserver ton bon
        </p>
      )}

      {/* Modale connexion */}
      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowAuth(false)}
          />
          <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl px-6 pt-6 pb-10 sm:pb-6 shadow-2xl">
            <div className="w-10 h-1 bg-[#E0E0E0] rounded-full mx-auto mb-6 sm:hidden" />
            <div className="text-center mb-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF6B00] mb-1">BONMOMENT</p>
              <h2 className="text-xl font-black text-[#0A0A0A]">Connecte-toi</h2>
              <p className="text-xs text-[#3D3D3D]/60 mt-1">
                Connecte-toi pour réserver ton bon
              </p>
            </div>
            <SignInPanel redirectAfter={pathname} context="reserver" />
            <button
              onClick={() => setShowAuth(false)}
              className="mt-4 w-full text-center text-xs text-[#3D3D3D]/40 hover:text-[#3D3D3D] transition-colors py-1"
            >
              Pas maintenant
            </button>
          </div>
        </div>
      )}
    </>
  )
}
