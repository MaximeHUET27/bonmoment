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
      const sessionKey = `avis_demande_${reservationId}`
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
              })
            }, 2000)
          }
        } catch {}
      }, 3000)
    }

    async function checkInitial() {
      // 1. Cherche un bon en statut 'reservee' à poller
      const { data: reserveeData } = await supabase
        .from('reservations')
        .select('id, offres(commerces(id, nom, place_id))')
        .eq('user_id', user.id)
        .eq('statut', 'reservee')
        .order('created_at', { ascending: false })
        .limit(1)

      if (!stopped && reserveeData?.[0]) {
        const r = reserveeData[0]
        const commerce = r.offres?.commerces
        const placeId = commerce?.place_id
        const hasValidPlace = placeId && !placeId.startsWith('test_')
        const sessionKey = `avis_demande_${r.id}`
        if (hasValidPlace && !sessionStorage.getItem(sessionKey)) {
          startPolling(r.id, commerce)
        }
      }

      // 2. Cherche un bon 'utilisee' pas encore noté
      const { data: utiliseeData } = await supabase
        .from('reservations')
        .select('id, offres(commerces(id, nom, place_id))')
        .eq('user_id', user.id)
        .eq('statut', 'utilisee')
        .order('created_at', { ascending: false })
        .limit(5)

      if (stopped || !utiliseeData?.length) return

      const ids = utiliseeData.map(r => r.id)
      const [{ data: avisData }, { data: feedbackData }] = await Promise.all([
        supabase.from('avis_google_clics').select('reservation_id').in('reservation_id', ids),
        supabase.from('feedbacks_commerce').select('reservation_id').in('reservation_id', ids),
      ])

      const reviewedIds = new Set([
        ...(avisData || []).map(a => a.reservation_id),
        ...(feedbackData || []).map(f => f.reservation_id),
      ])

      const notReviewed = utiliseeData.find(r => {
        const commerce = r.offres?.commerces
        const placeId = commerce?.place_id
        const hasValidPlace = placeId && !placeId.startsWith('test_')
        const sessionKey = `avis_demande_${r.id}`
        return hasValidPlace && !reviewedIds.has(r.id) && !sessionStorage.getItem(sessionKey)
      })

      if (!stopped && notReviewed) {
        const commerce = notReviewed.offres?.commerces
        setReviewData({
          reservationId: notReviewed.id,
          commerceId: commerce.id,
          commerceNom: commerce.nom,
          placeId: commerce.place_id,
        })
      }
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
      onClose={() => {
        sessionStorage.setItem(`avis_demande_${reviewData.reservationId}`, '1')
        setReviewData(null)
      }}
    />
  )
}
