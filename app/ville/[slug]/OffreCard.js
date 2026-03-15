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

function useCountdown(dateFin) {
  const [timeLeft, setTimeLeft] = useState(null)
  useEffect(() => {
    setTimeLeft(getTimeLeft(dateFin))
    const timer = setInterval(() => setTimeLeft(getTimeLeft(dateFin)), 1000)
    return () => clearInterval(timer)
  }, [dateFin])
  return timeLeft
}

function formatBadge(offre) {
  if (offre.type_remise === 'pourcentage') return `−${offre.valeur}%`
  if (offre.type_remise === 'montant')     return `−${offre.valeur}€`
  if (offre.type_remise === 'offert')      return 'Offert'
  return offre.type_remise || 'Offre'
}

export default function OffreCard({ offre }) {
  const timeLeft  = useCountdown(offre.date_fin)
  const commerce  = offre.commerces
  const urgent    = timeLeft && timeLeft.diff < 3600000
  const expired   = !timeLeft
  const epuise    = offre.nb_bons_restants <= 0
  const { user }  = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const pathname  = usePathname()

  function handleReserver() {
    if (!user) { setShowAuth(true); return }
    // TODO : logique de réservation
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-[#F0F0F0] shadow-sm overflow-hidden">

        {/* 1. Compte à rebours + bons restants */}
        <div className={`flex items-center justify-between px-4 py-3 ${urgent ? 'bg-red-50' : 'bg-[#F5F5F5]'}`}>
          <div className="flex items-center gap-2">
            <span className="text-base">⏱</span>
            {timeLeft ? (
              <span className={`text-sm font-black tabular-nums ${urgent ? 'text-red-500' : 'text-[#0A0A0A]'}`}>
                {urgent && <span className="text-xs font-semibold mr-1">Urgent —</span>}
                {String(timeLeft.h).padStart(2, '0')}h {String(timeLeft.m).padStart(2, '0')}m {String(timeLeft.s).padStart(2, '0')}s
              </span>
            ) : (
              <span className="text-sm font-bold text-red-500">C&apos;est parti&nbsp;!</span>
            )}
          </div>
          <span className={`text-xs font-bold ${offre.nb_bons_restants <= 5 ? 'text-red-500' : 'text-[#3D3D3D]'}`}>
            🎫 {offre.nb_bons_restants} restant{offre.nb_bons_restants > 1 ? 's' : ''}
          </span>
        </div>

        <div className="px-4 py-5 flex flex-col gap-3">

          {/* 2. Badge remise */}
          <div className="flex items-center justify-center bg-[#FFF0E0] rounded-2xl py-5">
            <span className="text-4xl font-black text-[#FF6B00] tracking-tight">
              {formatBadge(offre)}
            </span>
          </div>

          {/* 3. Titre */}
          <p className="text-base font-bold text-[#0A0A0A] text-center leading-snug">
            {offre.titre}
          </p>

          {/* 4. Commerce */}
          <div className="flex items-center justify-center gap-2">
            {commerce?.categorie && (
              <span className="text-[10px] font-semibold text-[#FF6B00] uppercase tracking-widest bg-[#FFF0E0] px-2 py-0.5 rounded-full">
                {commerce.categorie}
              </span>
            )}
            <span className="text-sm font-semibold text-[#1A1A1A]">{commerce?.nom}</span>
          </div>

          {/* 5. Ville */}
          {commerce?.ville && (
            <p className="text-xs text-[#3D3D3D]/60 text-center">📍 {commerce.ville}</p>
          )}

          {/* 6. CTA */}
          <button
            onClick={handleReserver}
            disabled={expired || epuise}
            className="w-full mt-1 bg-[#FF6B00] hover:bg-[#CC5500] disabled:bg-[#ccc] text-white font-bold text-sm py-3.5 rounded-full transition-colors duration-200 min-h-[48px]"
          >
            {epuise ? "C\u2019est parti\u00a0!" : expired ? "C\u2019est parti\u00a0!" : 'Réserver mon bon'}
          </button>

          {!user && !expired && !epuise && (
            <p className="text-center text-[10px] text-[#3D3D3D]/50 -mt-1">
              Connecte-toi pour réserver ton bon
            </p>
          )}

        </div>
      </div>

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
