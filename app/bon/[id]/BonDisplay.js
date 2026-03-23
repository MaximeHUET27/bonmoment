'use client'

/**
 * Affichage du bon en mode page standalone (pas d'overlay).
 * Identique visuellement à FullScreenBon mais sans fixed inset-0.
 */

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { formatDebut } from '@/lib/offreStatus'

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

function useCountdown(dateFin) {
  const [tl, setTl] = useState(null)
  useEffect(() => {
    function calc() {
      const diff = new Date(dateFin) - new Date()
      if (diff <= 0) return null
      return { h: Math.floor(diff / 3_600_000), m: Math.floor((diff % 3_600_000) / 60_000), s: Math.floor((diff % 60_000) / 1_000), diff }
    }
    setTl(calc())
    const t = setInterval(() => setTl(calc()), 1_000)
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
  if (offre.type_remise === 'atelier')        return '🎨 Atelier'
  return 'Offre'
}

export default function BonDisplay({ reservation, offre, commerce }) {
  const timeLeft = useCountdown(offre?.date_fin)
  const wakeLock = useRef(null)
  const [entered, setEntered] = useState(false)

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

  const qrUrl      = reservation?.qr_code_data || `${typeof window !== 'undefined' ? window.location.href : ''}`
  const mapsUrl    = commerce?.adresse
    ? `https://maps.google.com/?q=${encodeURIComponent(`${commerce.adresse}, ${commerce.ville || ''}`)}`
    : null
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
          <p className="text-sm text-[#3D3D3D]/60 mt-0.5">{offre?.titre}</p>
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
              <p className="text-xl font-black text-blue-600">📅 Valable à partir du</p>
              <p className="text-base font-bold text-blue-600 mt-1">{formatDebut(offre.date_debut)}</p>
              <p className="text-[11px] text-blue-400 mt-1 font-medium">Ce bon n'est pas encore actif</p>
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

        {commerce?.adresse && (
          <p className="text-xs text-[#3D3D3D]/60 text-center">
            📍 {commerce.adresse}{commerce.ville ? `, ${commerce.ville}` : ''}
          </p>
        )}

        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 border-2 border-[#FF6B00] text-[#FF6B00] font-bold text-sm py-3.5 rounded-2xl hover:bg-[#FFF0E0] transition-colors min-h-[48px]"
          >
            📍 S'y rendre
          </a>
        )}

      </div>
    </main>
  )
}
