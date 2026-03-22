'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import AuthBottomSheet from '@/app/components/AuthBottomSheet'
import FullScreenBon from '@/app/components/FullScreenBon'
import FavoriButton from '@/app/components/FavoriButton'
import { useReservation } from '@/app/hooks/useReservation'

const PENDING_KEY = 'bonmoment_pending_reservation'

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function getTimeLeft(dateFin) {
  const diff = new Date(dateFin) - new Date()
  if (diff <= 0) return null
  return {
    h:    Math.floor(diff / 3_600_000),
    m:    Math.floor((diff % 3_600_000) / 60_000),
    s:    Math.floor((diff % 60_000) / 1_000),
    diff,
  }
}

/* ── Composant ───────────────────────────────────────────────────────────── */

/**
 * @param {object} offre             - données de l'offre (avec commerces joint)
 * @param {number} reservationsCount - nb de réservations pour preuve sociale
 */
export default function UrgencyAndCTA({ offre, reservationsCount = 0 }) {
  const [timeLeft, setTimeLeft] = useState(null)
  const { user, supabase } = useAuth()
  const pathname   = usePathname()

  const [showAuth,          setShowAuth]          = useState(false)
  const [showBon,           setShowBon]           = useState(false)
  const [toast,             setToast]             = useState(null)
  const [abonneComm,        setAbonneComm]        = useState(false)
  const [abonneCommLoading, setAbonneCommLoading] = useState(false)

  const { reserver, status, reservation, reset, checkExisting } = useReservation()

  /* ── Countdown ── */
  useEffect(() => {
    setTimeLeft(getTimeLeft(offre.date_fin))
    const t = setInterval(() => setTimeLeft(getTimeLeft(offre.date_fin)), 1_000)
    return () => clearInterval(t)
  }, [offre.date_fin])

  /* ── Vérifier favori commerce au montage ── */
  useEffect(() => {
    if (!user || !offre.commerces?.id) return
    supabase.from('users').select('commerces_abonnes').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.commerces_abonnes?.includes(offre.commerces.id)) setAbonneComm(true)
      })
  }, [user, offre.commerces?.id, supabase])

  /* ── Vérifier réservation existante au montage (bouton vert persistant) ── */
  useEffect(() => {
    const finiCheck = (() => {
      const tl = getTimeLeft(offre.date_fin)
      if (!tl) return true
      const nb = offre.nb_bons_restants
      return nb !== null && nb !== 9999 && nb <= 0
    })()
    if (user && !finiCheck) checkExisting(offre.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, offre.id])

  /* ── Auto-pending : réservation déclenchée après retour OAuth ── */
  useEffect(() => {
    if (!user || !supabase) return
    const pendingId = sessionStorage.getItem(PENDING_KEY)
    if (pendingId !== offre.id) return
    sessionStorage.removeItem(PENDING_KEY)

    async function autoReserver() {
      let ville = offre.commerces?.ville
      if (!ville) {
        const { data: d } = await supabase
          .from('offres').select('commerces(ville)').eq('id', offre.id).single()
        ville = d?.commerces?.ville
      }
      if (ville) {
        const { data } = await supabase
          .from('users').select('villes_abonnees, notifications_email').eq('id', user.id).single()
        if (data) {
          const villes = data.villes_abonnees || []
          const isNew  = !villes.includes(ville)
          const updates = {}
          if (isNew) updates.villes_abonnees = [...villes, ville]
          if (!data.notifications_email) updates.notifications_email = true
          if (Object.keys(updates).length > 0) {
            await supabase.from('users').update(updates).eq('id', user.id)
            if (isNew) setToast(`🎉 Bienvenue à ${ville} ! Tu recevras les bons plans chaque soir à 21h.`)
          }
        }
      }
      reserver(offre)
    }
    autoReserver()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  /* ── Toggle favori commerce (depuis bouton offre expirée) ── */
  async function handleAbonnerComm() {
    if (!user) { setShowAuth(true); return }
    setAbonneCommLoading(true)
    const { data: current } = await supabase.from('users').select('commerces_abonnes').eq('id', user.id).single()
    const existant = current?.commerces_abonnes || []
    const next = abonneComm ? existant.filter(id => id !== offre.commerces?.id) : [...existant, offre.commerces?.id]
    await supabase.from('users').update({ commerces_abonnes: next }).eq('id', user.id)
    setAbonneComm(!abonneComm)
    setAbonneCommLoading(false)
  }

  /* ── Toast auto-dismiss ── */
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4_000)
    return () => clearTimeout(t)
  }, [toast])

  /* ── Toast sur erreurs métier ── */
  useEffect(() => {
    if (status === 'no_stock') setToast('😔 Plus de bons disponibles pour cette offre.')
    if (status === 'error')    setToast('⚠️ Une erreur est survenue. Réessaie dans quelques secondes.')
  }, [status])

  /* ── Show FullScreenBon après succès (1s de feedback ✓) ── */
  useEffect(() => {
    if (status === 'already_reserved') { setShowBon(true); return }
    if (status === 'success') {
      const t = setTimeout(() => setShowBon(true), 900)
      return () => clearTimeout(t)
    }
  }, [status])

  async function handleReserver() {
    if (!user) {
      sessionStorage.setItem(PENDING_KEY, offre.id)
      setShowAuth(true)
      return
    }
    await reserver(offre)
  }

  const expired     = !timeLeft
  const epuise      = offre.nb_bons_restants !== null &&
                      offre.nb_bons_restants !== 9999 &&
                      offre.nb_bons_restants <= 0
  const fini        = expired || epuise
  const urgentTime  = timeLeft && timeLeft.diff < 30 * 60_000
  const urgentStock = offre.nb_bons_restants !== null &&
                      offre.nb_bons_restants !== 9999 &&
                      offre.nb_bons_restants <= 5
  const urgent      = urgentTime || urgentStock

  /* ── États du bouton ── */
  const btnDisabled = fini || status === 'loading'

  const btnLabel = (() => {
    if (fini)                          return 'Trop tard !'
    if (status === 'loading')          return null
    if (status === 'success')          return '✓ Bon réservé !'
    if (status === 'already_reserved') return '✅ Bon réservé — Voir mon bon'
    if (status === 'no_stock')         return 'Plus de bons disponibles'
    if (status === 'error')            return '✗ Erreur — réessaie'
    return 'Réserver mon bon'
  })()

  const btnBase = 'w-full font-black text-lg py-4 rounded-2xl transition-all duration-200 min-h-[56px] flex items-center justify-center gap-2 shadow-lg active:scale-[0.97]'
  const btnColor = fini
    ? 'bg-[#D0D0D0] text-white cursor-not-allowed shadow-none'
    : (status === 'success' || status === 'already_reserved')
    ? 'bg-green-500 text-white shadow-green-200'
    : status === 'error'
    ? 'bg-red-500 text-white shadow-red-200'
    : 'bg-[#FF6B00] hover:bg-[#CC5500] text-white shadow-orange-200'

  /* ── Messages sous le bouton ── */
  const subMsg = (() => {
    if (status === 'no_stock') return 'Tous les bons ont été réservés.'
    if (status === 'already_reserved') return null
    if (status === 'error')    return 'Une erreur est survenue. Réessaie dans quelques secondes.'
    return null
  })()

  return (
    <>
      {/* ── Barre d'urgence ── */}
      <div
        className={`flex items-center justify-between px-4 py-3 rounded-2xl ${
          urgent && !fini ? '' : 'bg-[#F5F5F5]'
        }`}
        style={urgent && !fini ? { backgroundColor: '#FF6B00', color: 'white' } : {}}
      >
        {/* Countdown */}
        <div className="flex items-center gap-2">
          <span className="text-lg">⏱</span>
          {expired ? (
            <span className="text-sm font-bold text-red-500">Trop tard !</span>
          ) : (
            <span className={`text-base font-black tabular-nums tracking-tight ${
              urgent && !fini ? 'text-white' : 'text-[#0A0A0A]'
            }`}>
              {String(timeLeft.h).padStart(2, '0')}h{' '}
              {String(timeLeft.m).padStart(2, '0')}m{' '}
              {String(timeLeft.s).padStart(2, '0')}s
            </span>
          )}
        </div>

        {/* Bons restants */}
        <div className="text-right">
          <p className={`text-sm font-black ${
            urgent && !fini ? 'text-white' :
            urgentStock ? 'text-red-500 animate-pulse' : 'text-[#0A0A0A]'
          }`}>
            {offre.nb_bons_restants === null || offre.nb_bons_restants === 9999
              ? '∞ bons'
              : `🎫 ${offre.nb_bons_restants} restant${offre.nb_bons_restants > 1 ? 's' : ''}`}
          </p>
          {urgent && !fini && (
            <p className="text-[10px] text-white/80 font-semibold">
              {urgentTime && urgentStock ? 'Fin imminente !'
                : urgentTime ? 'Expire bientôt !'
                : 'Presque épuisé !'}
            </p>
          )}
        </div>
      </div>

      {/* ── CTA principal ── */}
      {fini ? (
        <button
          onClick={offre.commerces?.id ? handleAbonnerComm : undefined}
          disabled={abonneCommLoading || !offre.commerces?.id}
          className={`${btnBase} ${abonneComm ? 'bg-green-500 text-white shadow-green-200' : 'bg-[#FF6B00] hover:bg-[#CC5500] text-white shadow-orange-200'}`}
        >
          {abonneCommLoading
            ? <span className="w-6 h-6 border-[3px] border-white border-t-transparent rounded-full animate-spin" />
            : abonneComm
            ? '✅ Abonné à ce commerçant'
            : 'Trop tard ! Abonne-toi à ce commerçant ❤️'}
        </button>
      ) : (
        <button
          onClick={handleReserver}
          disabled={status === 'loading'}
          className={`${btnBase} ${btnColor}`}
        >
          {status === 'loading' ? (
            <span className="w-6 h-6 border-[3px] border-white border-t-transparent rounded-full animate-spin" />
          ) : btnLabel}
        </button>
      )}

      {/* ── Message contextuel sous le bouton ── */}
      {subMsg && (
        <p className={`text-center text-xs font-medium ${
          status === 'no_stock' || status === 'error' ? 'text-red-500' : 'text-[#3D3D3D]/50'
        }`}>
          {subMsg}
        </p>
      )}

      {/* ── Preuve sociale ── */}
      {reservationsCount > 0 && !fini && (
        <p className="text-center text-xs text-[#3D3D3D]/60 font-medium">
          🔥 {reservationsCount} habitant{reservationsCount > 1 ? 's ont' : ' a'} déjà réservé
        </p>
      )}

      {/* ── Favori commerce ── */}
      {offre.commerces?.id && (
        <div className="flex items-center justify-center gap-2">
          <FavoriButton
            commerceId={offre.commerces.id}
            commerceNom={offre.commerces.nom || ''}
          />
          <span className="text-xs text-[#3D3D3D]/60">Suivre {offre.commerces.nom}</span>
        </div>
      )}

      {/* ── Mention concours ── */}
      {offre.type_remise === 'concours' && (
        <p className="text-center text-[11px] text-[#3D3D3D]/50 bg-[#F5F5F5] px-4 py-3 rounded-xl">
          🎰 Présence physique obligatoire — fais valider ton bon chez le commerçant
        </p>
      )}

      {/* ── Auth bottom sheet ── */}
      <AuthBottomSheet
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        redirectAfter={pathname}
      />

      {/* ── Bon plein écran ── */}
      {showBon && reservation && (
        <FullScreenBon
          reservation={reservation}
          offre={offre}
          commerce={offre.commerces}
          onClose={() => { setShowBon(false); reset() }}
        />
      )}

      {/* ── Toast onboarding / erreur ── */}
      {toast && (
        <div
          className="fixed bottom-24 left-4 right-4 z-50 bg-[#0A0A0A] text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl text-center"
          style={{ animation: 'fadeSlideUp 0.3s ease' }}
        >
          {toast}
          <style>{`@keyframes fadeSlideUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }`}</style>
        </div>
      )}
    </>
  )
}
