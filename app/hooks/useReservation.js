'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/app/context/AuthContext'

/**
 * Hook partagé — logique de réservation côté client.
 * Utilisé dans UrgencyAndCTA (page détail) et OffreCard (grille).
 *
 * Statuts : 'idle' | 'loading' | 'success' | 'already_reserved' | 'no_stock' | 'error'
 */
export function useReservation() {
  const { user, supabase } = useAuth()
  const [status,      setStatus]      = useState('idle')
  const [reservation, setReservation] = useState(null)
  const [errorMsg,    setErrorMsg]    = useState(null)

  const reserver = useCallback(async (offre) => {
    if (!user) return false
    setStatus('loading')
    setErrorMsg(null)

    try {
      /* 1 — Déjà réservé ? */
      const { data: existing } = await supabase
        .from('reservations')
        .select('id, code_validation, qr_code_data')
        .eq('user_id',  user.id)
        .eq('offre_id', offre.id)
        .maybeSingle()

      if (existing) {
        setReservation(existing)
        setStatus('already_reserved')
        return existing
      }

      /* 2 — Stock suffisant ? (null / 9999 = illimité) */
      const nb = offre.nb_bons_restants
      if (nb !== null && nb !== 9999 && nb <= 0) {
        setStatus('no_stock')
        return false
      }

      /* 3 — Génère un code 6 chiffres unique sur cette offre */
      let code = null
      for (let i = 0; i < 10; i++) {
        const candidate = String(Math.floor(100_000 + Math.random() * 900_000))
        const { data: collision } = await supabase
          .from('reservations')
          .select('id')
          .eq('offre_id',         offre.id)
          .eq('code_validation',  candidate)
          .maybeSingle()
        if (!collision) { code = candidate; break }
      }
      if (!code) throw new Error('Impossible de générer un code unique.')

      /* 4 — Insertion */
      const { data: newRes, error: insertErr } = await supabase
        .from('reservations')
        .insert({
          user_id:         user.id,
          offre_id:        offre.id,
          code_validation: code,
          qr_code_data:    '',         // sera mis à jour juste après
          statut:          'reservee',
        })
        .select()
        .single()

      if (insertErr) throw insertErr

      /* 5 — Met à jour qr_code_data avec l'id réel */
      const qrUrl = `${window.location.origin}/bon/${newRes.id}`
      await supabase
        .from('reservations')
        .update({ qr_code_data: qrUrl })
        .eq('id', newRes.id)

      /* 6 — Décrémente le stock (RPC atomique) */
      if (nb !== null && nb !== 9999) {
        await supabase.rpc('decrement_bons_restants', { p_offre_id: offre.id })
      }

      const finalRes = { ...newRes, qr_code_data: qrUrl }
      setReservation(finalRes)
      setStatus('success')
      return finalRes

    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message)
      return false
    }
  }, [user, supabase])

  function reset() { setStatus('idle'); setReservation(null); setErrorMsg(null) }

  return { reserver, status, reservation, errorMsg, reset, setStatus }
}
