'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import FullScreenBon from './FullScreenBon'

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

/**
 * Bouton flottant centré en bas — visible si le client a un ou plusieurs bons actifs.
 * Support multi-bons avec sélecteur.
 */
export default function FloatingBonButton() {
  const { user, supabase } = useAuth()

  const [reservations, setReservations] = useState([])
  const [showPicker,   setShowPicker]   = useState(false)
  const [showBon,      setShowBon]      = useState(false)
  const [selected,     setSelected]     = useState(null)

  /* ── Cherche toutes les réservations actives ── */
  useEffect(() => {
    if (!user) { setReservations([]); return }

    async function fetchActive() {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id, code_validation, qr_code_data, statut,
          offres (
            id, titre, date_fin,
            commerces ( nom, adresse, ville )
          )
        `)
        .eq('user_id', user.id)
        .eq('statut',  'reservee')
        .order('created_at', { ascending: false })

      if (error || !data) return
      const now = new Date()
      setReservations(data.filter(r => r.offres && new Date(r.offres.date_fin) > now))
    }

    fetchActive()
    window.addEventListener('bonmoment:reservation', fetchActive)
    return () => window.removeEventListener('bonmoment:reservation', fetchActive)
  }, [user, supabase])

  /* ── Écoute l'événement "showpicker" depuis AuthButton ── */
  useEffect(() => {
    function onShowPicker() {
      if (reservations.length === 1) openBon(reservations[0])
      else if (reservations.length > 1) setShowPicker(v => !v)
    }
    window.addEventListener('bonmoment:showpicker', onShowPicker)
    return () => window.removeEventListener('bonmoment:showpicker', onShowPicker)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservations])

  /* ── Auto-expire : retire les bons expirés ── */
  useEffect(() => {
    if (!reservations.length) return
    function checkExpiry() {
      const now = new Date()
      const still = reservations.filter(r => new Date(r.offres.date_fin) > now)
      if (still.length !== reservations.length) {
        setReservations(still)
        if (!still.length) { setShowBon(false); setShowPicker(false) }
      }
    }
    const t = setInterval(checkExpiry, 10_000)
    return () => clearInterval(t)
  }, [reservations])

  if (!reservations.length) return null

  function openBon(r) {
    setSelected({
      reservation: { id: r.id, code_validation: r.code_validation, qr_code_data: r.qr_code_data },
      offre:       r.offres,
      commerce:    r.offres?.commerces,
    })
    setShowBon(true)
    setShowPicker(false)
  }

  function handleClick() {
    if (reservations.length === 1) {
      openBon(reservations[0])
    } else {
      setShowPicker(v => !v)
    }
  }

  return (
    <>
      {/* ── Picker multi-bons ── */}
      {showPicker && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-40 bg-white rounded-2xl shadow-2xl border border-[#F0F0F0] py-2 w-72 flex flex-col">
          {reservations.map(r => (
            <button
              key={r.id}
              onClick={() => openBon(r)}
              className="flex flex-col px-4 py-3 hover:bg-[#F5F5F5] transition-colors text-left border-b border-[#F5F5F5] last:border-0"
            >
              <span className="text-sm font-bold text-[#0A0A0A]">{formatBadge(r.offres)} · {r.offres?.titre}</span>
              <span className="text-xs text-[#3D3D3D]/60">{r.offres?.commerces?.nom}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Bouton principal ── */}
      <button
        onClick={handleClick}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-[#FF6B00] hover:bg-[#CC5500] text-white font-black text-sm px-5 py-3 rounded-full shadow-xl shadow-orange-300/50 transition-colors min-h-[48px] whitespace-nowrap"
        aria-label="Voir mon bon en cours"
      >
        <span className="text-base">🎟️</span>
        <span>{reservations.length > 1 ? `Mes bons (${reservations.length})` : 'Mon bon'}</span>
        {reservations.length > 1 && <span className="text-xs opacity-75">▲</span>}
      </button>

      {/* ── Bon plein écran ── */}
      {showBon && selected && (
        <FullScreenBon
          reservation={selected.reservation}
          offre={selected.offre}
          commerce={selected.commerce}
          onClose={() => { setShowBon(false); setSelected(null) }}
        />
      )}
    </>
  )
}
