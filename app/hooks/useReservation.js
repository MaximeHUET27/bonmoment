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
    console.log('[réservation] ▶ Début — offre.id:', offre.id)
    setStatus('loading')
    setErrorMsg(null)

    try {
      /* 0 — Auth fraîche (ne pas se fier uniquement au contexte) */
      const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !authUser) {
        console.error('[réservation] ✗ Auth échouée:', authErr?.message)
        throw new Error('Non connecté')
      }
      console.log('[réservation] ✔ User authentifié:', authUser.id)

      /* 1 — Déjà réservé ? (filtre statut='reservee' : une annulée/expirée ne bloque pas) */
      const { data: existing, error: existErr } = await supabase
        .from('reservations')
        .select('id, code_validation, qr_code_data')
        .eq('user_id',  authUser.id)
        .eq('offre_id', offre.id)
        .eq('statut',   'reservee')
        .maybeSingle()

      if (existErr) console.error('[réservation] ✗ Check existing:', existErr.message)

      if (existing) {
        console.log('[réservation] ↩ Déjà réservé:', existing.id)
        setReservation(existing)
        setStatus('already_reserved')
        return existing
      }

      /* 2 — Stock suffisant ? (null / 9999 = illimité) */
      const nb = offre.nb_bons_restants
      if (nb !== null && nb !== 9999 && nb <= 0) {
        console.log('[réservation] ✗ Plus de stock')
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
          .eq('offre_id',        offre.id)
          .eq('code_validation', candidate)
          .maybeSingle()
        if (!collision) { code = candidate; break }
      }
      if (!code) throw new Error('Impossible de générer un code unique.')
      console.log('[réservation] ✔ Code généré:', code)

      /* 4 — INSERT sans .select() pour éviter PGRST116 si la policy RLS SELECT
             ne couvre pas la ligne juste insérée */
      console.log('[réservation] → INSERT reservations — user_id:', authUser.id, 'offre_id:', offre.id)
      const { error: insertErr } = await supabase
        .from('reservations')
        .insert({
          user_id:         authUser.id,
          offre_id:        offre.id,
          code_validation: code,
          qr_code_data:    '',
          statut:          'reservee',
        })

      if (insertErr) {
        console.error('[réservation] ✗ Erreur INSERT —',
          'code:', insertErr.code,
          'message:', insertErr.message,
          'details:', insertErr.details,
          'hint:', insertErr.hint,
        )
        throw insertErr
      }
      console.log('[réservation] ✔ INSERT OK')

      /* 5 — SELECT séparé pour récupérer l'id de la ligne créée */
      const { data: newRes, error: selectErr } = await supabase
        .from('reservations')
        .select('id, code_validation, qr_code_data')
        .eq('user_id',  authUser.id)
        .eq('offre_id', offre.id)
        .eq('statut',   'reservee')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (selectErr) {
        console.error('[réservation] ⚠ SELECT après INSERT:', selectErr.code, selectErr.message)
      } else {
        console.log('[réservation] ✔ SELECT OK — id:', newRes.id)
      }

      /* 6 — Met à jour qr_code_data avec l'id réel */
      const resaId = newRes?.id
      const qrUrl  = resaId ? `${window.location.origin}/bon/${resaId}` : ''
      if (resaId) {
        const { error: updateErr } = await supabase
          .from('reservations')
          .update({ qr_code_data: qrUrl })
          .eq('id', resaId)
        if (updateErr) console.error('[réservation] ⚠ UPDATE qr_code_data:', updateErr.message)
        else console.log('[réservation] ✔ qr_code_data mis à jour')
      }

      /* 7 — Décrémente le stock via UPDATE direct (.gt empêche de passer en négatif) */
      if (nb !== null && nb !== 9999) {
        const { error: decrErr } = await supabase
          .from('offres')
          .update({ nb_bons_restants: nb - 1 })
          .eq('id', offre.id)
          .gt('nb_bons_restants', 0)
        if (decrErr) console.error('[réservation] ⚠ Décrémentation stock:', decrErr.message)
        else console.log('[réservation] ✔ Stock décrémenté')
      }

      const finalRes = newRes
        ? { ...newRes, qr_code_data: qrUrl || newRes.qr_code_data }
        : { id: resaId, code_validation: code, qr_code_data: qrUrl }

      setReservation(finalRes)
      setStatus('success')
      window.dispatchEvent(new Event('bonmoment:reservation'))
      console.log('[réservation] ✅ Succès — id:', finalRes.id)
      return finalRes

    } catch (err) {
      console.error('[réservation] ✗ ERREUR FATALE:', err.message, err)
      setStatus('error')
      setErrorMsg(err.message)
      return false
    }
  }, [user, supabase])

  /* Vérifie au montage si une réservation active existe déjà */
  const checkExisting = useCallback(async (offreId) => {
    if (!user || !supabase) return
    const { data: existing, error } = await supabase
      .from('reservations')
      .select('id, code_validation, qr_code_data')
      .eq('user_id',  user.id)
      .eq('offre_id', offreId)
      .eq('statut',   'reservee')
      .maybeSingle()
    if (error) console.error('[checkExisting] Erreur:', error.message)
    if (existing) {
      setReservation(existing)
      setStatus('already_reserved')
    }
  }, [user, supabase])

  function reset() { setStatus('idle'); setReservation(null); setErrorMsg(null) }

  return { reserver, status, reservation, errorMsg, reset, setStatus, checkExisting }
}
