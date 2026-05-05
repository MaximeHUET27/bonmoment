'use client'

import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import AuthButton from './AuthButton'
import VilleSearchOverlay from './VilleSearchOverlay'
import OffreCard, { getCategorieFiltre } from '@/app/ville/[slug]/OffreCard'
import SkeletonCard from './SkeletonCard'
import { useAuth } from '@/app/context/AuthContext'
import { toSlug } from '@/lib/utils'

const VillesBanner = memo(function VillesBanner({ villes, paused, onVilleSelect, onTouchStart, onTouchEnd }) {
  if (!villes.length) return null
  return (
    <div style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)', marginTop: '24px' }}>
      <p style={{ fontSize: '11px', color: 'rgba(61,61,61,0.5)', textAlign: 'center', marginBottom: '8px' }}>
        Villes disponibles :
      </p>
      <div className="villes-banner" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className={`villes-track${paused ? ' paused' : ''}`}>
          {Array.from({ length: 6 }, (_, rep) =>
            villes.map(v => (
              <button
                key={`a-${rep}-${v.id}`}
                onClick={() => onVilleSelect(v.nom)}
                style={{ fontSize: '12px', padding: '5px 14px', background: '#FFF0E0', color: '#FF6B00', fontWeight: 600, borderRadius: '20px', border: 'none', cursor: 'pointer', flexShrink: 0 }}
              >
                {v.nom}
              </button>
            ))
          )}
          {Array.from({ length: 6 }, (_, rep) =>
            villes.map(v => (
              <button
                key={`b-${rep}-${v.id}`}
                onClick={() => onVilleSelect(v.nom)}
                style={{ fontSize: '12px', padding: '5px 14px', background: '#FFF0E0', color: '#FF6B00', fontWeight: 600, borderRadius: '20px', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                aria-hidden="true"
                tabIndex={-1}
              >
                {v.nom}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
})

function isActive(offre) {
  return new Date(offre.date_fin) > new Date() && offre.nb_bons_restants !== 0
}

function isUrgent(offre) {
  const diff = new Date(offre.date_fin) - new Date()
  return diff > 0 && (diff < 7_200_000 || offre.nb_bons_restants < 5)
}

export default function HomeClient({ villes, offres }) {
  const router = useRouter()
  const { user, supabase } = useAuth()
  const [showOverlay,    setShowOverlay]    = useState(false)
  const [isLoading,      setIsLoading]      = useState(true)
  const [userResaMap,    setUserResaMap]    = useState(null)
  const [bannerPaused, setBannerPaused] = useState(false)
  const pauseTimerRef = useRef(null)

  useEffect(() => { setIsLoading(false) }, [])

  /* Batch fetch réservations utilisateur */
  useEffect(() => {
    if (!user || !supabase) { setUserResaMap({}); return }
    const offreIds = (offres || []).map(o => o.id)
    if (!offreIds.length) { setUserResaMap({}); return }

    async function fetchResas() {
      const { data } = await supabase
        .from('reservations')
        .select('offre_id, statut, id, code_validation, qr_code_data')
        .eq('user_id', user.id)
        .in('offre_id', offreIds)
      const map = {}
      for (const r of (data || [])) map[r.offre_id] = r
      setUserResaMap(map)
    }

    fetchResas()
    const onVisible = () => { if (document.visibilityState === 'visible') fetchResas() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, supabase])

  const handleVilleSelect = useCallback((nomVille) => {
    router.push(`/ville/${toSlug(nomVille)}`)
  }, [router])

  const handleVillesTouchStart = useCallback(() => {
    clearTimeout(pauseTimerRef.current)
    setBannerPaused(true)
  }, [])

  const handleVillesTouchEnd = useCallback(() => {
    pauseTimerRef.current = setTimeout(() => setBannerPaused(false), 2000)
  }, [])

  /* Tri : actives urgentes → actives → expirées */
  const offresTriees = (offres || []).sort((a, b) => {
    const now = new Date()
    const aFini = new Date(a.date_fin) <= now || (a.nb_bons_restants !== null && a.nb_bons_restants !== 9999 && a.nb_bons_restants <= 0)
    const bFini = new Date(b.date_fin) <= now || (b.nb_bons_restants !== null && b.nb_bons_restants !== 9999 && b.nb_bons_restants <= 0)
    if (aFini !== bFini) return aFini ? 1 : -1
    if (aFini) return new Date(b.date_fin) - new Date(a.date_fin)
    const ua = isUrgent(a) ? 1 : 0
    const ub = isUrgent(b) ? 1 : 0
    if (ub !== ua) return ub - ua
    return new Date(a.date_fin) - new Date(b.date_fin)
  })

  return (
    <div className="flex flex-col min-h-screen">

      {/* AuthButton fixe en haut à droite */}
      <div className="fixed top-4 right-4 z-40 bg-white rounded-full shadow-sm">
        <AuthButton />
      </div>

      {/* ── Bloc recherche + chips ── */}
      <div className="flex flex-col items-center px-6 pt-16 pb-8 text-center">

        {/* Tagline */}
        <p className="mb-3 text-center text-[#3D3D3D]" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 400, fontSize: '16px' }}>
          Pour vos commerçants, soyez là au
        </p>

        {/* Logo */}
        <Image
          src="/LOGO.png"
          alt="Logo BONMOMENT"
          width={900}
          height={450}
          priority
          unoptimized
          className="w-[338px] sm:w-[364px] h-auto mb-8"
        />

        {/* Champ de recherche ville */}
        <button
          onClick={() => setShowOverlay(true)}
          className={`search-ville${showOverlay ? ' active' : ''} w-[90%] max-w-[500px] h-14 flex items-center gap-3 px-5 rounded-[28px] border-2 border-[#FF6B00] bg-white text-left`}
          style={{ outline: 'none' }}
          aria-label="Rechercher une ville"
        >
          <svg className="shrink-0" width="20" height="20" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="8" stroke="#FF6B00" strokeWidth="2.2" />
            <path d="m21 21-4.35-4.35" stroke="#FF6B00" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <span className="text-lg font-normal text-[#9CA3AF] select-none">
            Trouve ta ville...
          </span>
        </button>

        {/* Chips des villes actives */}
        <VillesBanner
          villes={villes}
          paused={bannerPaused}
          onVilleSelect={handleVilleSelect}
          onTouchStart={handleVillesTouchStart}
          onTouchEnd={handleVillesTouchEnd}
        />
      </div>

      {/* ── Grille des offres (toutes villes actives) ── */}
      <div className="px-4 pb-8">
        {isLoading ? (
          <div className="flex flex-col gap-3 w-full max-w-[700px] mx-auto">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : offresTriees.length > 0 ? (
          <div className="flex flex-col gap-3 w-full max-w-[700px] mx-auto">
            {offresTriees.map(o => (
              <OffreCard
                key={o.id}
                offre={o}
                userReservation={userResaMap !== null ? (userResaMap[o.id] ?? null) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">🕐</div>
            <p className="text-[#0A0A0A] font-black text-base">
              Tes commerçants préparent des surprises...
            </p>
            <p className="text-[#3D3D3D]/60 text-sm mt-1">Reviens bientôt !</p>
          </div>
        )}
      </div>

      {/* Overlay sélecteur de ville */}
      <VilleSearchOverlay
        isOpen={showOverlay}
        onClose={() => setShowOverlay(false)}
        villesBonmoment={villes}
        onSelectActive={handleVilleSelect}
      />
    </div>
  )
}
