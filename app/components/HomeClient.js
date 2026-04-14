'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import AuthButton from './AuthButton'
import VilleSearchOverlay from './VilleSearchOverlay'
import OffreCard, { getCategorieFiltre } from '@/app/ville/[slug]/OffreCard'
import SkeletonCard from './SkeletonCard'
import { useAuth } from '@/app/context/AuthContext'
import { toSlug } from '@/lib/utils'

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
  const bannerRef     = useRef(null)
  const rafRef        = useRef(null)
  const pauseTimerRef = useRef(null)
  const isDragging    = useRef(false)
  const dragStartX    = useRef(0)
  const dragScrollL   = useRef(0)

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

  function handleVilleSelect(nomVille) {
    router.push(`/ville/${toSlug(nomVille)}`)
  }

  // ── Marquee JS (scrollLeft) ───────────────────────────────────────────────
  function startMarquee() {
    cancelAnimationFrame(rafRef.current)
    function tick() {
      const el = bannerRef.current
      if (!el) return
      el.scrollLeft += 0.5
      // Boucle seamless : reset quand on a parcouru exactement le set A
      if (el.scrollLeft >= el.scrollWidth / 2) {
        el.scrollLeft -= el.scrollWidth / 2
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  function stopMarquee() {
    cancelAnimationFrame(rafRef.current)
  }

  useEffect(() => {
    startMarquee()
    return () => stopMarquee()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Drag-to-scroll (desktop) ──────────────────────────────────────────────
  function handleBannerMouseDown(e) {
    isDragging.current  = true
    dragStartX.current  = e.clientX
    dragScrollL.current = bannerRef.current?.scrollLeft ?? 0
    e.preventDefault()
  }

  function handleBannerMouseMove(e) {
    if (!isDragging.current || !bannerRef.current) return
    const dx = e.clientX - dragStartX.current
    bannerRef.current.scrollLeft = dragScrollL.current - dx
  }

  function handleBannerMouseUp() {
    isDragging.current = false
  }

  // ── Touch (mobile) ────────────────────────────────────────────────────────
  function handleVillesTouchStart() {
    clearTimeout(pauseTimerRef.current)
    stopMarquee()
  }
  function handleVillesTouchEnd() {
    pauseTimerRef.current = setTimeout(startMarquee, 3000)
  }

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

      {/* CSS animation pulse */}
      <style>{`
        @keyframes pulse-border {
          0%, 100% { border-color: #FF6B00; box-shadow: 0 0 0 0 rgba(255, 107, 0, 0.2); }
          50%       { border-color: #FFB366; box-shadow: 0 0 0 8px rgba(255, 107, 0, 0); }
        }
        .search-ville        { animation: pulse-border 2s ease-in-out infinite; }
        .search-ville.active { animation: none; box-shadow: 0 0 0 4px rgba(255, 107, 0, 0.15); }
      `}</style>

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
        {villes.length > 0 && (
          /* Bleed full-width hors du px-6 parent */
          <div style={{ width: '100vw', position: 'relative', left: '50%', transform: 'translateX(-50%)', marginTop: '24px' }}>

            {/* Label fixe centré au-dessus de la bannière */}
            <p style={{ fontSize: '11px', color: 'rgba(61,61,61,0.5)', textAlign: 'center', marginBottom: '8px' }}>
              Villes disponibles :
            </p>

            {/*
              Bannière défilante.
              La piste contient 2 moitiés identiques (set A + set B, 8 répétitions chacune).
              translateX(-50%) déplace exactement le set A hors de l'écran → le set B
              prend sa place → boucle seamless.
              Le hover pause via CSS (.villes-banner:hover .villes-track).
              Le touch pause via animationPlayState inline (mobile).
            */}
            <div
              ref={bannerRef}
              className="villes-banner"
              onMouseEnter={stopMarquee}
              onMouseLeave={() => { isDragging.current = false; startMarquee() }}
              onMouseDown={handleBannerMouseDown}
              onMouseMove={handleBannerMouseMove}
              onMouseUp={handleBannerMouseUp}
              onTouchStart={handleVillesTouchStart}
              onTouchEnd={handleVillesTouchEnd}
            >
              <div className="villes-track">
                {/* Set A — 8 répétitions */}
                {Array.from({ length: 8 }, (_, rep) =>
                  villes.map(v => (
                    <button
                      key={`a-${rep}-${v.id}`}
                      onClick={() => handleVilleSelect(v.nom)}
                      style={{ fontSize: '12px', padding: '5px 14px', background: '#FFF0E0', color: '#FF6B00', fontWeight: 600, borderRadius: '20px', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                    >
                      {v.nom}
                    </button>
                  ))
                )}
                {/* Set B — identique, pour la boucle seamless */}
                {Array.from({ length: 8 }, (_, rep) =>
                  villes.map(v => (
                    <button
                      key={`b-${rep}-${v.id}`}
                      onClick={() => handleVilleSelect(v.nom)}
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
        )}
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
