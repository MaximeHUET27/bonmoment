'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import FullScreenBon from './FullScreenBon'

/**
 * Bouton flottant bas-droite — visible si le client a un bon actif (statut='reservee' ET non expiré).
 * Disparaît automatiquement à l'expiration.
 * Intégré dans le layout global.
 */
export default function FloatingBonButton() {
  const { user, supabase } = useAuth()

  const [reservation, setReservation] = useState(null)
  const [offre,       setOffre]       = useState(null)
  const [commerce,    setCommerce]    = useState(null)
  const [showBon,     setShowBon]     = useState(false)
  const [expired,     setExpired]     = useState(false)

  /* ── Cherche la réservation active la plus récente ── */
  useEffect(() => {
    if (!user) { setReservation(null); return }

    async function fetchActive() {
      setExpired(false)
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

      const now    = new Date()
      const active = data.find(r => r.offres && new Date(r.offres.date_fin) > now)

      if (active) {
        setReservation({ id: active.id, code_validation: active.code_validation, qr_code_data: active.qr_code_data })
        setOffre(active.offres)
        setCommerce(active.offres?.commerces)
      } else {
        setReservation(null)
      }
    }

    fetchActive()
    window.addEventListener('bonmoment:reservation', fetchActive)
    return () => window.removeEventListener('bonmoment:reservation', fetchActive)
  }, [user, supabase])

  /* ── Auto-expire : surveille l'heure de fin ── */
  useEffect(() => {
    if (!offre?.date_fin) return
    function checkExpiry() {
      if (new Date(offre.date_fin) <= new Date()) {
        setExpired(true)
        setReservation(null)
        setShowBon(false)
      }
    }
    checkExpiry()
    const t = setInterval(checkExpiry, 10_000)
    return () => clearInterval(t)
  }, [offre?.date_fin])

  if (!reservation || expired) return null

  return (
    <>
      <button
        onClick={() => setShowBon(true)}
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 bg-[#FF6B00] hover:bg-[#CC5500] text-white font-black text-sm px-5 py-3 rounded-full shadow-xl shadow-orange-300/50 transition-colors min-h-[48px]"
        aria-label="Voir mon bon en cours"
      >
        <span className="text-base">🎟️</span>
        <span>Mon bon</span>
      </button>

      {showBon && (
        <FullScreenBon
          reservation={reservation}
          offre={offre}
          commerce={commerce}
          onClose={() => setShowBon(false)}
        />
      )}
    </>
  )
}
