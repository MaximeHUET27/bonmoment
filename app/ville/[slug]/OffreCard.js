'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'

const PENDING_KEY = 'bonmoment_pending_reservation'
import AuthBottomSheet from '@/app/components/AuthBottomSheet'
import FullScreenBon from '@/app/components/FullScreenBon'
import FavoriButton from '@/app/components/FavoriButton'
import ShareButton from '@/app/components/ShareButton'
import { useReservation } from '@/app/hooks/useReservation'

/* ── Mapping catégorie Google → filtre ───────────────────────────────────── */

const CATEGORIE_MAP = {
  restaurant:     'resto',
  cafe:           'resto',
  bar:            'resto',
  bakery:         'resto',
  hair_care:      'beaute',
  beauty_salon:   'beaute',
  spa:            'beaute',
  clothing_store: 'shopping',
  florist:        'shopping',
  jewelry_store:  'shopping',
  gym:            'loisirs',
  bowling_alley:  'loisirs',
  movie_theater:  'loisirs',
}

export function getCategorieFiltre(cat) {
  return CATEGORIE_MAP[cat?.toLowerCase()] || null
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function getTimeLeft(dateFin) {
  const diff = new Date(dateFin) - new Date()
  if (diff <= 0) return null
  return {
    h: Math.floor(diff / 3_600_000),
    m: Math.floor((diff % 3_600_000) / 60_000),
    s: Math.floor((diff % 60_000) / 1_000),
    diff,
  }
}

function useCountdown(dateFin) {
  const [tl, setTl] = useState(null)
  useEffect(() => {
    setTl(getTimeLeft(dateFin))
    const t = setInterval(() => setTl(getTimeLeft(dateFin)), 1_000)
    return () => clearInterval(t)
  }, [dateFin])
  return tl
}

function formatBadge(offre) {
  if (offre.type_remise === 'pourcentage')    return `−${offre.valeur}%`
  if (offre.type_remise === 'montant_fixe')   return `−${offre.valeur}€`
  if (offre.type_remise === 'montant')        return `−${offre.valeur}€`   // rétrocompat
  if (offre.type_remise === 'cadeau')         return '🎁 Cadeau'
  if (offre.type_remise === 'produit_offert') return '📦 Offert'
  if (offre.type_remise === 'service_offert') return '✂️ Offert'
  if (offre.type_remise === 'offert')         return 'Offert'               // rétrocompat
  if (offre.type_remise === 'concours')       return '🎰 Concours'
  if (offre.type_remise === 'atelier')        return '🎨 Atelier'
  return offre.type_remise || 'Offre'
}

/* ── Composant ───────────────────────────────────────────────────────────── */

export default function OffreCard({ offre }) {
  const timeLeft = useCountdown(offre.date_fin)
  const commerce = offre.commerces
  const expired  = !timeLeft
  const epuise   = offre.nb_bons_restants !== null &&
                   offre.nb_bons_restants !== 9999 &&
                   offre.nb_bons_restants <= 0
  const fini     = expired || epuise

  const urgent   = timeLeft && (
    timeLeft.diff < 3_600_000 ||
    (offre.nb_bons_restants !== null && offre.nb_bons_restants < 5)
  )

  const { user, supabase } = useAuth()
  const pathname  = usePathname()
  const [showAuth,          setShowAuth]          = useState(false)
  const [showBon,           setShowBon]           = useState(false)
  const [toast,             setToast]             = useState(null)
  const [abonneComm,        setAbonneComm]        = useState(false)
  const [abonneCommLoading, setAbonneCommLoading] = useState(false)

  const { reserver, status, reservation, reset, checkExisting } = useReservation()

  /* ── Vérifier favori commerce au montage ── */
  useEffect(() => {
    if (!user || !commerce?.id) return
    supabase.from('users').select('commerces_abonnes').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.commerces_abonnes?.includes(commerce.id)) setAbonneComm(true)
      })
  }, [user, commerce?.id, supabase])

  /* ── Vérifier réservation existante au montage (bouton vert persistant) ── */
  useEffect(() => {
    if (user && !fini) checkExisting(offre.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, offre.id])

  /* ── Auto-pending : réservation déclenché après retour OAuth ── */
  useEffect(() => {
    if (!user || !supabase) return
    const pendingId = sessionStorage.getItem(PENDING_KEY)
    if (pendingId !== offre.id) return
    sessionStorage.removeItem(PENDING_KEY)

    async function autoReserver() {
      // Récupère la ville depuis les props ou via supabase (fix toast ville)
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
  async function handleAbonnerComm(e) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { setShowAuth(true); return }
    setAbonneCommLoading(true)
    const { data: current } = await supabase.from('users').select('commerces_abonnes').eq('id', user.id).single()
    const existant = current?.commerces_abonnes || []
    const next = abonneComm ? existant.filter(id => id !== commerce.id) : [...existant, commerce.id]
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

  /* ── Affichage FullScreenBon après succès (1s de feedback vert) ── */
  useEffect(() => {
    if (status === 'success') {
      const t = setTimeout(() => setShowBon(true), 900)
      return () => clearTimeout(t)
    }
  }, [status])

  async function handleReserver(e) {
    e.preventDefault()  // empêche navigation si dans un Link
    e.stopPropagation()
    if (fini) return
    if (status === 'already_reserved') { setShowBon(true); return }
    if (!user) {
      sessionStorage.setItem(PENDING_KEY, offre.id)
      setShowAuth(true)
      return
    }
    await reserver(offre)
  }

  /* ── Libellé et style du bouton selon l'état ── */
  const btnLabel = (() => {
    if (fini)                          return 'Trop tard !'
    if (status === 'loading')          return null                  // spinner
    if (status === 'success')          return '✓ Bon réservé !'
    if (status === 'already_reserved') return '✅ Bon réservé — Voir mon bon'
    if (status === 'no_stock')         return 'Plus de bons…'
    if (status === 'error')            return '✗ Erreur — réessaie'
    return 'Réserver mon bon'
  })()

  const btnColor = fini                           ? 'bg-[#D0D0D0] cursor-not-allowed'
    : status === 'success'                        ? 'bg-green-500'
    : status === 'error'                          ? 'bg-red-500'
    : status === 'already_reserved'               ? 'bg-green-500'
    : status === 'no_stock'                       ? 'bg-[#FF6B00]'
    : 'bg-[#FF6B00] hover:bg-[#CC5500] active:scale-[0.97]'

  /* ── Pulse sur le compteur de bons si < 5 ── */
  const nbPulse = !fini && offre.nb_bons_restants !== null &&
                  offre.nb_bons_restants !== 9999 &&
                  offre.nb_bons_restants <= 5

  return (
    <>
      <div className="bg-white rounded-2xl border border-[#F0F0F0] shadow-sm overflow-hidden flex flex-col">

        {/* Zone 1 : header + corps grisés pour les cartes expirées */}
        <div className={fini ? 'opacity-50 grayscale pointer-events-none' : ''}>

        {/* ── Header : countdown + bons restants + partage ── */}
        <div className={`flex items-center gap-1 px-2 py-1.5 ${
          urgent && !fini ? 'bg-red-50' : 'bg-[#F5F5F5]'
        }`}>
          <Link href={`/offre/${offre.id}`} className="flex-1 flex items-center justify-between gap-1.5 px-1 py-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">⏱</span>
              {timeLeft ? (
                <span className={`text-xs font-black tabular-nums ${
                  urgent && !fini ? 'text-red-500' : 'text-[#0A0A0A]'
                }`}>
                  {urgent && !fini && <span className="font-semibold mr-1 text-[10px]">Urgent —</span>}
                  {String(timeLeft.h).padStart(2, '0')}h{' '}
                  {String(timeLeft.m).padStart(2, '0')}m{' '}
                  {String(timeLeft.s).padStart(2, '0')}s
                </span>
              ) : (
                <span className="text-xs font-black text-[#3D3D3D]/60">Trop tard !</span>
              )}
            </div>
            <span className={`text-[11px] font-bold ${nbPulse ? 'text-red-500 animate-pulse' : 'text-[#3D3D3D]'}`}>
              {offre.nb_bons_restants === null || offre.nb_bons_restants === 9999
                ? '∞ bons'
                : `🎫 ${offre.nb_bons_restants}`}
            </span>
          </Link>
          <ShareButton offre={offre} commerce={commerce} />
        </div>

        {/* ── Corps : cliquable → détail ── */}
        <Link href={`/offre/${offre.id}`} className="block flex-1 px-3 py-4 flex flex-col gap-2.5">

          {/* Badge remise */}
          <div className="flex items-center justify-center bg-[#FFF0E0] rounded-xl py-4">
            <span className="text-2xl font-black text-[#FF6B00] tracking-tight leading-none">
              {formatBadge(offre)}
            </span>
          </div>

          {/* Titre */}
          <p className="text-xs font-bold text-[#0A0A0A] text-center leading-snug line-clamp-2">
            {offre.titre}
          </p>

          {/* Commerce + catégorie + favori */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {commerce?.categorie && (
              <span className="text-[9px] font-semibold text-[#FF6B00] uppercase tracking-wider bg-[#FFF0E0] px-1.5 py-0.5 rounded-full">
                {getCategorieFiltre(commerce.categorie) || commerce.categorie}
              </span>
            )}
            <span className="text-xs font-semibold text-[#1A1A1A] truncate max-w-[90px]">{commerce?.nom}</span>
            {commerce?.id && (
              <FavoriButton commerceId={commerce.id} commerceNom={commerce.nom || ''} className="!min-h-[28px] !min-w-[28px]" />
            )}
          </div>

          {/* Ville */}
          {commerce?.ville && (
            <p className="text-[10px] text-[#3D3D3D]/50 text-center">📍 {commerce.ville}</p>
          )}

        </Link>

        </div>{/* fin Zone 1 */}

        {/* Zone 2 : CTA toujours actif — non affecté par grayscale/opacity */}
        <div className="px-3 pb-3 pointer-events-auto">
          {fini ? (
            <button
              onClick={handleAbonnerComm}
              disabled={abonneCommLoading}
              className={`w-full text-white font-semibold py-3 px-4 rounded-lg transition-colors cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5 ${
                abonneComm
                  ? 'bg-green-500'
                  : 'bg-[#FF6B00] hover:bg-[#CC5500]'
              }`}
            >
              {abonneCommLoading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : abonneComm
                ? '✅ Abonné à ce commerçant'
                : 'Trop tard ! Abonne-toi à ce commerçant ❤️'}
            </button>
          ) : (
            <button
              onClick={handleReserver}
              disabled={status === 'loading'}
              className={`w-full text-white font-bold text-xs py-2.5 rounded-full transition-all duration-200 min-h-[40px] flex items-center justify-center gap-1.5 ${btnColor}`}
            >
              {status === 'loading' ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : btnLabel}
            </button>
          )}

          {/* Erreur */}
          {status === 'error' && (
            <p className="text-[10px] text-red-500 text-center mt-1 font-semibold">Réessaie dans quelques secondes.</p>
          )}
        </div>

      </div>

      {/* ── Bottom sheet auth ── */}
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
          commerce={commerce}
          onClose={() => setShowBon(false)}
        />
      )}

      {/* ── Toast onboarding ── */}
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
