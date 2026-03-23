'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import ShareButton from '@/app/components/ShareButton'
import { useAuth } from '@/app/context/AuthContext'
import { formatDebut } from '@/lib/offreStatus'

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

/* ── Composant ────────────────────────────────────────────────────────── */

/**
 * @param {object}   reservation  - { id, code_validation, qr_code_data }
 * @param {object}   offre        - { titre, date_fin }
 * @param {object}   commerce     - { nom, adresse, ville }
 * @param {function} onClose      - callback fermeture (null = pas de bouton ×)
 */
export default function FullScreenBon({ reservation, offre, commerce, onClose }) {
  const { supabase }     = useAuth()
  const timeLeft         = useCountdown(offre?.date_fin)
  const wakeLock         = useRef(null)
  const [entered,        setEntered]        = useState(false)
  const [confirmCancel,  setConfirmCancel]  = useState(false)
  const [cancelling,     setCancelling]     = useState(false)
  const [isAndroid,      setIsAndroid]      = useState(false)
  const [walletUrl,      setWalletUrl]      = useState(null)

  /* Animation d'entrée */
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 30)
    return () => clearTimeout(t)
  }, [])

  /* Détection Android + chargement URL Google Wallet */
  useEffect(() => {
    const android = /Android/i.test(navigator.userAgent)
    setIsAndroid(android)
    if (!android || !reservation?.id) return
    fetch(`/api/wallet/google?reservation_id=${reservation.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.url) setWalletUrl(d.url) })
      .catch(() => {})
  }, [reservation?.id])

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

  async function handleCancel() {
    setCancelling(true)
    try {
      await supabase.from('reservations').update({ statut: 'annulee' }).eq('id', reservation.id)
      const { data: o } = await supabase.from('offres').select('nb_bons_restants').eq('id', offre.id).single()
      if (o?.nb_bons_restants != null && o.nb_bons_restants !== 9999) {
        await supabase.from('offres').update({ nb_bons_restants: o.nb_bons_restants + 1 }).eq('id', offre.id)
      }
      window.dispatchEvent(new Event('bonmoment:reservation'))
      onClose?.()
    } catch {
      setCancelling(false)
    }
  }

  const qrUrl      = reservation?.qr_code_data
    || `${typeof window !== 'undefined' ? window.location.origin : 'https://bonmoment.app'}/bon/${reservation?.id}`

  const mapsUrl    = commerce?.adresse
    ? `https://maps.google.com/?q=${encodeURIComponent(`${commerce.adresse}, ${commerce.ville || ''}`)}`
    : null

  const programmee = offre?.date_debut && new Date(offre.date_debut) > new Date()
  const timerRed   = !programmee && timeLeft && timeLeft.diff < 1_800_000

  return (
    <div className="fixed inset-0 z-[100] flex flex-col sm:items-center sm:justify-center sm:bg-black/60">
      <div className="relative bg-white flex-1 sm:flex-none overflow-y-auto sm:w-full sm:max-w-[500px] sm:max-h-[90vh] sm:rounded-3xl sm:shadow-2xl">

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

      <div className="flex flex-col items-center justify-center gap-6 px-6 py-10 min-h-full sm:min-h-0 max-w-sm mx-auto w-full">

        {/* ── Commerce + titre ── */}
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF6B00]">
            BONMOMENT
          </p>
          <p className="text-base font-black text-[#0A0A0A] mt-1">
            {commerce?.nom}
          </p>
          <span className="inline-block mt-1 mb-0.5 px-2.5 py-0.5 rounded-full bg-[#FFF0E0] text-[#FF6B00] text-xs font-black">
            {formatBadge(offre)}
          </span>
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
          {programmee ? (
            <>
              <p className="text-xl font-black text-blue-600">📅 Valable à partir du</p>
              <p className="text-base font-bold text-blue-600 mt-1">{formatDebut(offre.date_debut)}</p>
              <p className="text-[11px] text-blue-400 mt-1 font-medium">Ce bon n'est pas encore actif</p>
            </>
          ) : timeLeft ? (
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
            <p className="text-base font-black text-red-500">Trop tard — bon expiré</p>
          )}
        </div>

        {/* ── Adresse ── */}
        {commerce?.adresse && (
          <p className="text-xs text-[#3D3D3D]/60 text-center">
            📍 {commerce.adresse}{commerce.ville ? `, ${commerce.ville}` : ''}
          </p>
        )}

        {/* ── Bouton Google Wallet (Android uniquement) ── */}
        {isAndroid && walletUrl && (
          <a
            href={walletUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white font-bold text-sm py-3.5 rounded-2xl transition-colors min-h-[48px]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
            </svg>
            Ajouter à Google Wallet
          </a>
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

        {/* ── Bouton partager post-réservation ── */}
        <ShareButton
          offre={offre}
          commerce={commerce}
          label="Fais profiter tes proches ! ↗"
          shareText={`Je viens de réserver un bon chez ${commerce?.nom || 'ce commerce'} à ${commerce?.ville || 'ma ville'} ! Il reste encore des places 👉 bonmoment.app/offre/${offre?.id}`}
          shareTitle={`Bon plan chez ${commerce?.nom || 'ce commerce'} — BONMOMENT`}
          className="w-full [&>button]:w-full"
        />

        {/* ── Annulation ── */}
        {onClose && !confirmCancel && (
          <button
            onClick={() => setConfirmCancel(true)}
            className="text-[10px] text-[#3D3D3D]/40 hover:text-red-400 transition-colors"
          >
            Annuler ma réservation
          </button>
        )}
        {confirmCancel && (
          <div className="w-full bg-red-50 border border-red-100 rounded-2xl px-4 py-4 flex flex-col gap-3 text-center">
            <p className="text-sm font-bold text-red-600">Annuler ce bon ?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmCancel(false)}
                className="flex-1 border border-[#E0E0E0] text-sm font-semibold py-2.5 rounded-xl"
              >
                Non
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 bg-red-500 text-white text-sm font-bold py-2.5 rounded-xl flex items-center justify-center"
              >
                {cancelling
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : 'Oui, annuler'}
              </button>
            </div>
          </div>
        )}

        {/* Espace bas */}
        <div className="h-4" />
      </div>
      </div>
    </div>
  )
}
