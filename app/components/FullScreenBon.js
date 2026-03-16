'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'

/* QRCodeSVG chargé dynamiquement (évite SSR) */
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

/* ── Helpers ──────────────────────────────────────────────────────────── */

function useCountdown(dateFin) {
  const [tl, setTl] = useState(null)
  useEffect(() => {
    function calc() {
      const diff = new Date(dateFin) - new Date()
      if (diff <= 0) return null
      return {
        h:    Math.floor(diff / 3_600_000),
        m:    Math.floor((diff % 3_600_000) / 60_000),
        s:    Math.floor((diff % 60_000) / 1_000),
        diff,
      }
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

/* ── Composant ────────────────────────────────────────────────────────── */

/**
 * @param {object}   reservation  - { id, code_validation, qr_code_data }
 * @param {object}   offre        - { titre, date_fin }
 * @param {object}   commerce     - { nom, adresse, ville }
 * @param {function} onClose      - callback fermeture (null = pas de bouton ×)
 */
export default function FullScreenBon({ reservation, offre, commerce, onClose }) {
  const timeLeft   = useCountdown(offre?.date_fin)
  const wakeLock   = useRef(null)
  const [entered,  setEntered]  = useState(false)

  /* Animation d'entrée */
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 30)
    return () => clearTimeout(t)
  }, [])

  /* Wake lock — empêche la mise en veille */
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

  const qrUrl   = reservation?.qr_code_data
    || `${typeof window !== 'undefined' ? window.location.origin : 'https://bonmoment.app'}/bon/${reservation?.id}`

  const mapsUrl = commerce?.adresse
    ? `https://maps.google.com/?q=${encodeURIComponent(`${commerce.adresse}, ${commerce.ville || ''}`)}`
    : null

  const timerRed = timeLeft && timeLeft.diff < 1_800_000

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col overflow-y-auto">

      {/* ── Bouton fermer ── */}
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-[#F5F5F5] hover:bg-[#E0E0E0] text-[#3D3D3D] transition-colors text-xl font-bold"
        >
          ×
        </button>
      )}

      <div className="flex flex-col items-center justify-center gap-6 px-6 py-10 min-h-full max-w-sm mx-auto w-full">

        {/* ── Commerce + titre ── */}
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF6B00]">
            BONMOMENT
          </p>
          <p className="text-base font-black text-[#0A0A0A] mt-1">
            {commerce?.nom}
          </p>
          <p className="text-sm text-[#3D3D3D]/60 mt-0.5 leading-snug">
            {offre?.titre}
          </p>
        </div>

        {/* ── QR Code ── */}
        <div
          className="transition-all duration-500 ease-out"
          style={{
            transform: entered ? 'scale(1)' : 'scale(0.8)',
            opacity:   entered ? 1 : 0,
          }}
        >
          <div className="p-4 bg-white rounded-3xl shadow-2xl border border-[#F0F0F0]">
            <QRCodeSVG
              value={qrUrl}
              size={250}
              bgColor="#FFFFFF"
              fgColor="#0A0A0A"
              level="M"
            />
          </div>
        </div>

        {/* ── Code 6 chiffres ── */}
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

        {/* ── Séparateur ── */}
        <div className="w-full border-t border-[#F0F0F0]" />

        {/* ── Timer expiration ── */}
        <div className="text-center">
          {timeLeft ? (
            <>
              <p className={`text-2xl font-black tabular-nums tracking-tight ${timerRed ? 'text-red-500' : 'text-[#0A0A0A]'}`}>
                {String(timeLeft.h).padStart(2, '0')}h{' '}
                {String(timeLeft.m).padStart(2, '0')}m{' '}
                {String(timeLeft.s).padStart(2, '0')}s
              </p>
              <p className="text-[11px] text-[#3D3D3D]/50 mt-1 font-medium">
                {timerRed ? '⚠ Présente ce bon rapidement !' : 'Présente ce bon avant expiration'}
              </p>
            </>
          ) : (
            <p className="text-base font-black text-red-500">C'est parti — bon expiré</p>
          )}
        </div>

        {/* ── Adresse ── */}
        {commerce?.adresse && (
          <p className="text-xs text-[#3D3D3D]/60 text-center">
            📍 {commerce.adresse}{commerce.ville ? `, ${commerce.ville}` : ''}
          </p>
        )}

        {/* ── Bouton S'y rendre ── */}
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

        {/* Espace bas */}
        <div className="h-4" />
      </div>
    </div>
  )
}
