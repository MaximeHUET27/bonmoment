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

      /* 1 — Cherche une réservation existante, quel que soit le statut.
             La table a une contrainte UNIQUE(user_id, offre_id) : on ne peut pas
             insérer deux lignes. Si une ancienne existe (annulée/expirée) → UPDATE. */
      const { data: existing, error: existErr } = await supabase
        .from('reservations')
        .select('id, code_validation, qr_code_data, statut')
        .eq('user_id',  authUser.id)
        .eq('offre_id', offre.id)
        .maybeSingle()

      if (existErr) console.error('[réservation] ✗ Check existing:', existErr.message)

      if (existing?.statut === 'reservee') {
        console.log('[réservation] ↩ Déjà réservé (actif):', existing.id)
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

      /* 4 — INSERT ou UPDATE selon qu'une ligne existe déjà (contrainte unique_user_offre) */
      let writeErr = null
      if (existing) {
        // Réactivation d'une réservation annulée/expirée
        console.log('[réservation] → UPDATE réactivation (statut précédent:', existing.statut, ')')
        const { error } = await supabase
          .from('reservations')
          .update({ statut: 'reservee', code_validation: code, qr_code_data: '', utilise_at: null })
          .eq('id', existing.id)
        writeErr = error
      } else {
        console.log('[réservation] → INSERT reservations — user_id:', authUser.id, 'offre_id:', offre.id)
        const { error } = await supabase
          .from('reservations')
          .insert({ user_id: authUser.id, offre_id: offre.id, code_validation: code, qr_code_data: '', statut: 'reservee' })
        writeErr = error
      }

      if (writeErr) {
        console.error('[réservation] ✗ Erreur écriture —',
          'code:', writeErr.code,
          'message:', writeErr.message,
          'details:', writeErr.details,
          'hint:', writeErr.hint,
        )
        throw writeErr
      }
      console.log('[réservation] ✔ Écriture OK')

      /* 5 — SELECT pour récupérer l'id de la ligne créée/réactivée */
      const { data: newRes, error: selectErr } = await supabase
        .from('reservations')
        .select('id, code_validation, qr_code_data')
        .eq('user_id',  authUser.id)
        .eq('offre_id', offre.id)
        .eq('statut',   'reservee')
        .single()

      if (selectErr) {
        console.error('[réservation] ⚠ SELECT après écriture:', selectErr.code, selectErr.message)
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
