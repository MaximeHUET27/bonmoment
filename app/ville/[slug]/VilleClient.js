'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/app/context/AuthContext'
import OffreCard from './OffreCard'
import SkeletonCard from '@/app/components/SkeletonCard'
import { getCategorieFiltre } from './OffreCard'
import VilleAbonnement from '@/app/components/VilleAbonnement'
import VilleSearchOverlay from '@/app/components/VilleSearchOverlay'
import { toSlug } from '@/lib/utils'
import { getOffreStatus } from '@/lib/offreStatus'

const CarteVille = dynamic(() => import('./CarteVille'), { ssr: false })

const ORANGE = '#FF6B00'

/* ── Filtres ─────────────────────────────────────────────────────────────── */

const FILTERS_CATEGORIE = [
  { id: 'tous',     label: '🔥 Tous' },
  { id: 'resto',    label: '🍽️ Alimentaire' },
  { id: 'beaute',   label: '💇 Beauté' },
  { id: 'shopping', label: '🛍️ Shopping' },
  { id: 'loisirs',  label: '🎮 Loisirs' },
  { id: 'autres',   label: '🏪 Autres' },
]

const FILTERS_TYPE = [
  { id: 'remise',   label: '💰 Remise' },
  { id: 'offerts',  label: '🎁 Offert' },
  { id: 'atelier',  label: '🎉 Évènement' },
  { id: 'concours', label: '🎰 Concours' },
  { id: 'fidelite', label: '⭐ Fidélité' },
]

function getOffreFiltre(offre) {
  if (offre.commerces?.categorie_bonmoment) return offre.commerces.categorie_bonmoment
  return getCategorieFiltre(offre.commerces?.categorie) || 'autres'
}

function getTypeFiltre(offre) {
  const t = offre.type_remise
  if (t === 'pourcentage' || t === 'montant_fixe' || t === 'montant') return 'remise'
  if (t === 'cadeau' || t === 'offert' || t === 'produit_offert')      return 'offerts'
  if (t === 'service_offert')                                           return 'service'
  if (t === 'atelier')                                                  return 'atelier'
  if (t === 'concours')                                                 return 'concours'
  if (t === 'fidelite')                                                 return 'fidelite'
  return null
}

function matchFiltre(offre, filtre) {
  if (filtre === 'tous') return true
  if (FILTERS_TYPE.some(f => f.id === filtre)) return getTypeFiltre(offre) === filtre
  return getOffreFiltre(offre) === filtre
}

function isActive(offre) {
  return (
    new Date(offre.date_fin) > new Date() &&
    offre.nb_bons_restants !== 0
  )
}

function isUrgent(offre) {
  const diff = new Date(offre.date_fin) - new Date()
  return diff > 0 && (diff < 7_200_000 || (offre.nb_bons_restants !== null && offre.nb_bons_restants < 5))
}

/* ── Compteur animé (roulette eased) ─────────────────────────────────────── */

function AnimatedCounter({ target, duration = 1500, delay = 0 }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now()
      const animate = (now) => {
        const elapsed = now - start
        const progress = Math.min(elapsed / duration, 1)
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
        setCount(Math.round(eased * target))
        if (progress < 1) requestAnimationFrame(animate)
      }
      requestAnimationFrame(animate)
    }, delay)
    return () => clearTimeout(timeout)
  }, [target, duration, delay])

  return <span>{count}</span>
}

function CounterStat({ emoji, value, label, delay }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-baseline gap-1">
        <span className="text-base" aria-hidden="true">{emoji}</span>
        <span className="font-bold text-base sm:text-xl text-[#FF6B00]">
          <AnimatedCounter target={value} delay={delay} />
        </span>
      </div>
      <span className="text-xs font-normal text-[#3D3D3D]">{label}</span>
    </div>
  )
}

/* ── Composant principal ────────────────────────────────────────────────────── */

export default function VilleClient({
  offres,
  villeNom,
  villePhotoUrl,
  villeLat,
  villeLng,
  nbOffresActives,
  nbAbonnes,
  nbCommerces,
  villes = [],
}) {
  const router = useRouter()
  const { user, supabase } = useAuth()
  const [filtre,       setFiltre]       = useState('tous')
  const [isLoading,    setIsLoading]    = useState(true)
  const [showOverlay,  setShowOverlay]  = useState(false)
  const [showCarte,    setShowCarte]    = useState(false)
  const [userResaMap,  setUserResaMap]  = useState(null)

  /* ── Pull-to-refresh (mobile uniquement) ── */
  const [pullY,      setPullY]      = useState(0)
  const [pulling,    setPulling]    = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const startYRef = useRef(0)
  const startXRef = useRef(0)
  const PULL_THRESHOLD = 60

  function onTouchStart(e) {
    if (!('ontouchstart' in window)) return
    startYRef.current = e.touches[0].clientY
    startXRef.current = e.touches[0].clientX
  }

  function onTouchMove(e) {
    if (!('ontouchstart' in window)) return
    if (window.scrollY > 0) { setPulling(false); setPullY(0); return }
    const dy = e.touches[0].clientY - startYRef.current
    const dx = e.touches[0].clientX - startXRef.current
    if (dy > 0 && Math.abs(dy) > Math.abs(dx)) {
      setPulling(true)
      setPullY(dy)
    } else {
      setPulling(false)
      setPullY(0)
    }
  }

  async function onTouchEnd() {
    if (!pulling) { setPullY(0); return }
    if (pullY >= PULL_THRESHOLD) {
      setRefreshing(true)
      setPullY(0)
      setPulling(false)
      router.refresh()
      await new Promise(r => setTimeout(r, 2000))
      setRefreshing(false)
    } else {
      setPullY(0)
      setPulling(false)
    }
  }

  const pullDisplay = Math.min(pullY * 0.45, 70)

  useEffect(() => { setIsLoading(false) }, [])

  /* ── Batch fetch des réservations utilisateur ── */
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

  /* ── Filtrage + tri ── */
  const offresActives     = (offres || []).filter(isActive)
  const activesDansFiltre = offresActives.filter(o => matchFiltre(o, filtre))

  const STATUS_ORDER = { en_cours: 0, programmee: 1, expiree: 2 }

  const offresAffichees = (offres || [])
    .filter(o => {
      if (!isActive(o)) return true
      return matchFiltre(o, filtre)
    })
    .sort((a, b) => {
      const aStatus = getOffreStatus(a)
      const bStatus = getOffreStatus(b)
      const aOrder  = STATUS_ORDER[aStatus] ?? 2
      const bOrder  = STATUS_ORDER[bStatus] ?? 2
      if (aOrder !== bOrder) return aOrder - bOrder
      if (aStatus === 'en_cours') {
        const aUrg = isUrgent(a) ? 1 : 0
        const bUrg = isUrgent(b) ? 1 : 0
        if (bUrg !== aUrg) return bUrg - aUrg
        return new Date(a.date_fin) - new Date(b.date_fin)
      }
      if (aStatus === 'programmee') return new Date(a.date_debut) - new Date(b.date_debut)
      return new Date(b.date_fin) - new Date(a.date_fin)
    })

  if (isLoading) {
    return (
      <div className="px-3 sm:px-4 py-4">
        <div className="flex flex-col gap-3 w-full max-w-[700px] mx-auto">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div
      className="w-full"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <style>{`
        @keyframes ptr-spin    { to { transform: rotate(360deg) } }
        @keyframes slideUp     { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes carteSlideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        .ville-title           { animation: slideUp 0.3s ease both; }
        .ville-stats           { animation: slideUp 0.3s ease 0.1s both; }
        .carte-btn             { transition: background 0.18s ease, color 0.18s ease; }
        .carte-btn:hover       { background: #FF6B00 !important; color: white !important; }
        .carte-modale-inner    { animation: carteSlideUp 0.3s ease both; }
      `}</style>

      {/* ── Indicateur pull-to-refresh ── */}
      {(pulling || refreshing) && (
        <div
          className="fixed top-0 left-0 right-0 flex justify-center z-50 pointer-events-none"
          style={{
            transform: `translateY(${refreshing ? 56 : pullDisplay}px)`,
            opacity: refreshing ? 1 : Math.min(pullY / PULL_THRESHOLD, 1),
            transition: refreshing ? 'none' : 'transform 0.08s ease, opacity 0.08s ease',
          }}
        >
          <div className="bg-white rounded-full p-2 shadow-lg mt-1">
            <Image
              src="/LOGO.png"
              alt=""
              width={72}
              height={36}
              style={{ animation: refreshing ? 'ptr-spin 1s linear infinite' : 'none' }}
              unoptimized
            />
          </div>
        </div>
      )}

      {/* ── Header immersif ville ── */}
      <div
        className="relative overflow-hidden rounded-b-3xl"
        style={{ minHeight: '180px' }}
        aria-label={`Ville : ${villeNom}`}
      >
        {/* Photo de fond (désaturée, opacité 15%) */}
        {villePhotoUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${villePhotoUrl})`,
              opacity: 0.30,
            }}
          />
        )}

        {/* Dégradé overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0.15) 100%)',
          }}
        />

        {/* Contenu : nom + compteurs */}
        <div className="relative flex flex-col items-center justify-center py-5 gap-2 sm:gap-3 px-4">
          <h1 className="ville-title text-2xl sm:text-[32px] md:text-[40px] font-black text-[#FF6B00] text-center tracking-tight leading-tight break-words w-full max-w-[380px] px-2">
            {villeNom.toUpperCase()}
          </h1>

          <div className="ville-stats flex items-center justify-center gap-4 sm:gap-6">
            <CounterStat emoji="🔥" value={nbOffresActives} label="offres"    delay={0}   />
            <CounterStat emoji="👥" value={nbAbonnes}       label="abonnés"   delay={200} />
            <CounterStat emoji="🏪" value={nbCommerces}     label="commerces" delay={400} />
          </div>

          <div className="flex flex-col min-[400px]:flex-row items-center justify-center gap-2 w-full max-w-[80%]">
            <VilleAbonnement
              villeNom={villeNom}
              className="w-full min-[400px]:w-auto !text-sm !rounded-[20px] !px-5 !py-2 !font-semibold !justify-center"
            />
            {villeLat && villeLng && (
              <button
                onClick={() => setShowCarte(true)}
                className="carte-btn w-full min-[400px]:w-auto justify-center"
                style={{
                  border: `1.5px solid ${ORANGE}`,
                  color: ORANGE,
                  background: 'transparent',
                  borderRadius: 20,
                  padding: '8px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  lineHeight: 1.4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                🗺️ Voir la carte
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Bandeau ville ── */}
      <div className="flex items-center px-4 py-3 border-b border-[#F0F0F0] bg-white sticky top-[57px] z-30">
        <button
          onClick={() => setShowOverlay(true)}
          className="flex items-center gap-1.5 text-sm font-bold text-[#0A0A0A] hover:text-[#FF6B00] transition-colors min-h-[44px]"
        >
          <span>📍 {villeNom}</span>
          <span className="text-[#FF6B00] text-xs font-semibold">Changer ▼</span>
        </button>
      </div>

      {/* ── Barre de filtres ── */}
      <div
        className="flex items-center gap-2 overflow-x-auto px-4 py-3 border-b border-[#F0F0F0]"
        style={{ scrollbarWidth: 'none' }}
      >
        {FILTERS_CATEGORIE.map(f => (
          <button
            key={f.id}
            onClick={() => setFiltre(f.id)}
            className={`shrink-0 text-xs font-bold px-4 py-2 rounded-full transition-colors whitespace-nowrap min-h-[36px] ${
              filtre === f.id
                ? 'bg-[#FF6B00] text-white'
                : 'bg-[#F5F5F5] text-[#3D3D3D] hover:bg-[#FFF0E0] hover:text-[#FF6B00]'
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="w-px h-6 bg-gray-300 mx-1 shrink-0" />
        {FILTERS_TYPE.map(f => (
          <button
            key={f.id}
            onClick={() => setFiltre(f.id)}
            className={`shrink-0 text-xs font-bold px-4 py-2 rounded-full transition-colors whitespace-nowrap min-h-[36px] ${
              filtre === f.id
                ? 'bg-[#FF6B00] text-white'
                : 'bg-[#F5F5F5] text-[#3D3D3D] hover:bg-[#FFF0E0] hover:text-[#FF6B00]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Grille d'offres ── */}
      <div className="px-3 sm:px-4 py-4 sm:py-6">
        {offresAffichees.length > 0 ? (
          <>
            {filtre !== 'tous' && activesDansFiltre.length === 0 && (
              <p className="text-sm font-semibold text-[#3D3D3D]/60 text-center mb-4">
                Pas de {[...FILTERS_CATEGORIE, ...FILTERS_TYPE].find(f => f.id === filtre)?.label.replace(/^\S+\s/, '')} en ce moment — tes commerçants préparent des surprises !
              </p>
            )}
            <div className="flex flex-col gap-3 w-full max-w-[700px] mx-auto">
              {offresAffichees.map(o => (
                <OffreCard
                  key={o.id}
                  offre={o}
                  userReservation={userResaMap !== null ? (userResaMap[o.id] ?? null) : undefined}
                />
              ))}
            </div>
          </>
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

      {/* ── Overlay sélecteur de ville ── */}
      <VilleSearchOverlay
        isOpen={showOverlay}
        onClose={() => setShowOverlay(false)}
        villesBonmoment={villes}
        onSelectActive={handleVilleSelect}
      />

      {/* ── Modale carte interactive ── */}
      {showCarte && villeLat && villeLng && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowCarte(false) }}
        >
          <div
            className="carte-modale-inner max-sm:max-w-full max-sm:max-h-full max-sm:rounded-none"
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              maxWidth: '80vw',
              maxHeight: '80vh',
              background: 'white',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => setShowCarte(false)}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 10,
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: 34,
                height: 34,
                fontSize: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
            <CarteVille
              villeNom={villeNom}
              villeLat={Number(villeLat)}
              villeLng={Number(villeLng)}
            />
          </div>
        </div>
      )}

    </div>
  )
}
