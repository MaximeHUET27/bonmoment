'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import ReviewOverlay from './ReviewOverlay'

export default function ReviewPolling() {
  const { user, supabase } = useAuth()
  const [reviewData, setReviewData] = useState(null)
  const pollingRef = useRef(null)

  useEffect(() => {
    if (!user || !supabase) return
    let stopped = false

    function startPolling(reservationId, commerce) {
      if (pollingRef.current) clearInterval(pollingRef.current)
      const sessionKey = `avis_demande_${commerce.id}`
      let prevStatut = 'reservee'

      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/bon-statut/${reservationId}`)
          if (!res.ok) return
          const { statut } = await res.json()
          if (statut === 'utilisee' && prevStatut !== 'utilisee') {
            prevStatut = 'utilisee'
            sessionStorage.setItem(sessionKey, '1')
            clearInterval(pollingRef.current)
            setTimeout(() => {
              if (!stopped) setReviewData({
                reservationId,
                commerceId: commerce.id,
                commerceNom: commerce.nom,
                placeId: commerce.place_id,
                source: 'bon',
              })
            }, 2000)
          }
        } catch {}
      }, 3000)
    }

    async function checkInitial() {
      // 1. Bon reservee : activer le polling temps réel
      const { data: reserveeData } = await supabase
        .from('reservations')
        .select('id, offres!inner(commerces!inner(id, nom, place_id))')
        .eq('user_id', user.id)
        .eq('statut', 'reservee')
        .order('created_at', { ascending: false })
        .limit(1)

      if (!stopped && reserveeData?.[0]) {
        const r = reserveeData[0]
        const commerce = r.offres?.commerces
        const placeId = commerce?.place_id
        if (placeId && !placeId.startsWith('test_') && !sessionStorage.getItem(`avis_demande_${commerce.id}`)) {
          startPolling(r.id, commerce)
        }
      }

      // 2. Candidats : bons utilisés (toutes les reservations, sans limite) + cartes fidélité
      const [{ data: utiliseeData }, { data: cartesData }] = await Promise.all([
        supabase
          .from('reservations')
          .select('id, created_at, offres!inner(commerces!inner(id, nom, place_id))')
          .eq('user_id', user.id)
          .eq('statut', 'utilisee')
          .order('created_at', { ascending: false }),
        supabase
          .from('cartes_fidelite')
          .select('commerce_id, derniere_activite, commerces!inner(id, nom, place_id)')
          .eq('user_id', user.id),
      ])

      if (stopped) return

      // 3. Map commerce_id → candidat le plus récent (bon ou tampon)
      const candidatesMap = new Map()

      for (const r of (utiliseeData || [])) {
        const commerce = r.offres?.commerces
        if (!commerce?.id) continue
        const existing = candidatesMap.get(commerce.id)
        if (!existing || new Date(r.created_at) > new Date(existing.lastDate)) {
          candidatesMap.set(commerce.id, { commerce, lastDate: r.created_at, reservationId: r.id, source: 'bon' })
        }
      }

      for (const c of (cartesData || [])) {
        const commerce = c.commerces
        if (!commerce?.id) continue
        const existing = candidatesMap.get(commerce.id)
        if (!existing || new Date(c.derniere_activite) > new Date(existing.lastDate)) {
          candidatesMap.set(commerce.id, { commerce, lastDate: c.derniere_activite, reservationId: null, source: 'tampon' })
        }
      }

      if (!candidatesMap.size || stopped) return

      // 4. Vérification : quels commerces ont déjà été notés via (user_id, commerce_id)
      const commerceIds = [...candidatesMap.keys()]
      const [{ data: avisData }, { data: feedbackData }] = await Promise.all([
        supabase.from('avis_google_clics').select('commerce_id').eq('user_id', user.id).in('commerce_id', commerceIds),
        supabase.from('feedbacks_commerce').select('commerce_id').eq('user_id', user.id).in('commerce_id', commerceIds),
      ])

      const reviewedCommerces = new Set([
        ...(avisData || []).map(a => a.commerce_id),
        ...(feedbackData || []).map(f => f.commerce_id),
      ])

      // 5. Filtrage et sélection du candidat le plus récent non encore noté
      const candidates = [...candidatesMap.values()].filter(({ commerce }) => {
        if (!commerce.place_id || commerce.place_id.startsWith('test_')) return false
        if (reviewedCommerces.has(commerce.id)) return false
        if (sessionStorage.getItem(`avis_demande_${commerce.id}`)) return false
        return true
      })

      if (stopped || !candidates.length) return

      candidates.sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate))
      const best = candidates[0]

      setReviewData({
        reservationId: best.reservationId,
        commerceId: best.commerce.id,
        commerceNom: best.commerce.nom,
        placeId: best.commerce.place_id,
        source: best.source,
      })
    }

    checkInitial()

    return () => {
      stopped = true
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [user, supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!reviewData) return null

  return (
    <ReviewOverlay
      reservationId={reviewData.reservationId}
      commerceId={reviewData.commerceId}
      commerceNom={reviewData.commerceNom}
      placeId={reviewData.placeId}
      source={reviewData.source}
      onClose={() => {
        sessionStorage.setItem(`avis_demande_${reviewData.commerceId}`, '1')
        setReviewData(null)
      }}
    />
  )
}
