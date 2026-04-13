'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/app/context/AuthContext'

/**
 * Hook partagé — logique de réservation côté client.
 * Utilisé dans UrgencyAndCTA (page détail) et OffreCard (grille).
 *
 * Statuts : 'idle' | 'loading' | 'success' | 'already_reserved' | 'already_used' | 'already_expired' | 'no_stock' | 'error'
 */
export function useReservation() {
  const { user, supabase } = useAuth()
  const [status,      setStatus]      = useState('idle')
  const [reservation, setReservation] = useState(null)
  const [errorMsg,    setErrorMsg]    = useState(null)

  const reserver = useCallback(async (offre) => {
    setStatus('loading')
    setErrorMsg(null)

    try {
      /* 0 — Auth fraîche (ne pas se fier uniquement au contexte) */
      const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !authUser) {
        console.error('[réservation] Auth échouée:', authErr?.message)
        throw new Error('Non connecté')
      }

      /* 1 — Cherche une réservation existante, quel que soit le statut.
             La table a une contrainte UNIQUE(user_id, offre_id) : on ne peut pas
             insérer deux lignes. Si une ancienne existe (annulée/expirée) → UPDATE. */
      const { data: existing, error: existErr } = await supabase
        .from('reservations')
        .select('id, code_validation, qr_code_data, statut')
        .eq('user_id',  authUser.id)
        .eq('offre_id', offre.id)
        .maybeSingle()

      if (existErr) console.error('[réservation] Check existing:', existErr.message)

      if (existing?.statut === 'reservee') {
        setReservation(existing)
        setStatus('already_reserved')
        return existing
      }
      if (existing?.statut === 'utilisee') {
        setStatus('already_used')
        return false
      }
      if (existing?.statut === 'expiree') {
        setStatus('already_expired')
        return false
      }
      // statut 'annulee' → la RPC autorisera la réactivation si on réinsère

      /* 2 — Appel RPC atomique : vérifie stock, génère code, crée réservation en une transaction */
      const { data: rpcRows, error: rpcErr } = await supabase.rpc('reserver_bon', {
        p_offre_id: offre.id,
        p_user_id:  authUser.id,
      })

      if (rpcErr) {
        console.error('[réservation] RPC error:', rpcErr.message)
        throw rpcErr
      }

      const result = rpcRows?.[0]
      if (!result?.success) {
        if (result?.message === 'Plus de bons disponibles' || result?.message === 'Offre indisponible') {
          setStatus('no_stock')
          return false
        }
        if (result?.message === 'reservee') {
          // Doublon détecté par la RPC — charger la réservation existante
          const { data: dup } = await supabase
            .from('reservations')
            .select('id, code_validation, qr_code_data')
            .eq('user_id', authUser.id)
            .eq('offre_id', offre.id)
            .eq('statut', 'reservee')
            .single()
          if (dup) { setReservation(dup); setStatus('already_reserved'); return dup }
        }
        throw new Error(result?.message || 'Erreur lors de la réservation')
      }

      /* 3 — Mettre à jour qr_code_data avec l'URL réelle (la RPC retourne l'id) */
      const resaId = result.reservation_id
      const qrUrl  = resaId ? `${window.location.origin}/bon/${resaId}` : ''
      if (resaId) {
        const { error: updateErr } = await supabase
          .from('reservations')
          .update({ qr_code_data: qrUrl })
          .eq('id', resaId)
        if (updateErr) console.error('[réservation] UPDATE qr_code_data:', updateErr.message)
      }

      const finalRes = { id: resaId, code_validation: result.code_validation, qr_code_data: qrUrl }
      setReservation(finalRes)
      setStatus('success')
      window.dispatchEvent(new Event('bonmoment:reservation'))

      /* Notification push non-bloquante → commerçant */
      fetch('/api/push/notify-reservation', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ offre_id: offre.id }),
      }).catch(() => {})

      return finalRes

    } catch (err) {
      console.error('[réservation] ERREUR FATALE:', err.message)
      setStatus('error')
      setErrorMsg(err.message)
      return false
    }
  }, [supabase])

  /* Vérifie au montage si une réservation existe déjà (quel que soit le statut) */
  const checkExisting = useCallback(async (offreId) => {
    if (!user || !supabase || !offreId) return
    const { data: existing, error } = await supabase
      .from('reservations')
      .select('id, code_validation, qr_code_data, statut')
      .eq('user_id',  user.id)
      .eq('offre_id', offreId)
      .maybeSingle()
    if (error) console.error('[checkExisting] Erreur:', error.message)

    if (!existing) return
    if (existing.statut === 'reservee') {
      setReservation(existing)
      setStatus('already_reserved')
    } else if (existing.statut === 'utilisee') {
      setStatus('already_used')
    } else if (existing.statut === 'expiree') {
      setStatus('already_expired')
    }
    // 'annulee' → idle (autoriser nouvelle réservation)
  }, [user, supabase])

  function reset() { setStatus('idle'); setReservation(null); setErrorMsg(null) }

  return { reserver, status, reservation, errorMsg, reset, setStatus, setReservation, checkExisting }
}
