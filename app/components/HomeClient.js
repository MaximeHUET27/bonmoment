'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SkeletonCard from './SkeletonCard'
import OffreCard, { getCategorieFiltre } from '@/app/ville/[slug]/OffreCard'
import VilleAbonnement from './VilleAbonnement'
import VilleSearchOverlay from './VilleSearchOverlay'
import { useAuth } from '@/app/context/AuthContext'
import { toSlug } from '@/lib/utils'

/* ── Barre de filtres catégorie ─────────────────────────────────────────── */

const FILTERS = [
  { id: 'tous',     label: '🔥 Tous' },
  { id: 'resto',    label: '🍽️ Resto' },
  { id: 'beaute',   label: '💇 Beauté' },
  { id: 'shopping', label: '🛍️ Shopping' },
  { id: 'loisirs',  label: '🎮 Loisirs' },
  { id: 'offerts',  label: '🎁 Offerts' },
  { id: 'concours', label: '🎰 Concours' },
]

function getOffreFiltre(offre) {
  if (offre.type_remise === 'offert' || offre.type_remise === 'cadeau') return 'offerts'
  if (offre.type_remise === 'concours') return 'concours'
  return getCategorieFiltre(offre.commerces?.categorie) || 'tous'
}

function isUrgent(offre) {
  const diff = new Date(offre.date_fin) - new Date()
  return diff > 0 && (diff < 7_200_000 || offre.nb_bons_restants < 5)
}

/* ── Composant principal ────────────────────────────────────────────────── */

export default function HomeClient({ offres, villes }) {
  const { user, supabase }  = useAuth()
  const router              = useRouter()

  const [ville,           setVille]           = useState(null)
  const [viewAll,         setViewAll]         = useState(false)
  const [filtre,          setFiltre]          = useState('tous')
  const [isLoading,       setIsLoading]       = useState(true)
  const [showOverlay,     setShowOverlay]     = useState(false)
  const [villesAbonnees,  setVillesAbonnees]  = useState([])
  const [villeFiltre,     setVilleFiltre]     = useState(null) // null = toutes mes villes

  /* Lecture localStorage + détection ?view=all côté client uniquement */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('view') === 'all') {
      setViewAll(true)
      setVille(null)
      try { localStorage.removeItem('bonmoment_ville') } catch {}
    } else {
      const savedVille = localStorage.getItem('bonmoment_ville')
      if (savedVille) setVille(savedVille)
    }
    setIsLoading(false)
  }, [])

  /* Chargement villes_abonnees quand user change */
  useEffect(() => {
    if (!user || !supabase) { setVillesAbonnees([]); return }
    supabase
      .from('users')
      .select('villes_abonnees')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) console.error('Erreur chargement villes abonnées:', error.message)
        setVillesAbonnees(data?.villes_abonnees || [])
      })
  }, [user, supabase])

  /* Quand l'utilisateur sélectionne une ville active dans l'overlay */
  function handleVilleSelect(nomVille) {
    setVille(nomVille)
    localStorage.setItem('bonmoment_ville', nomVille)
    router.push(`/ville/${toSlug(nomVille)}`)
  }

  /* Multi-city filter visible si user abonné à 2+ villes */
  const showMultiCityFilter = villesAbonnees.length >= 2

  /* ── Filtrage ── */
  const offresFiltrees = (offres || [])
    .filter(o => {
      const villeOffre = o.commerces?.ville
      if (viewAll || showMultiCityFilter) {
        if (villeFiltre) return villeOffre === villeFiltre
        if (villesAbonnees.length > 0) return villesAbonnees.includes(villeOffre)
        return true
      }
      if (ville && villeOffre !== ville) return false
      if (filtre === 'tous') return true
      return getOffreFiltre(o) === filtre
    })
    .sort((a, b) => {
      const now = new Date()
      const aFini = new Date(a.date_fin) <= now ||
        (a.nb_bons_restants !== null && a.nb_bons_restants !== 9999 && a.nb_bons_restants <= 0)
      const bFini = new Date(b.date_fin) <= now ||
        (b.nb_bons_restants !== null && b.nb_bons_restants !== 9999 && b.nb_bons_restants <= 0)
      if (aFini !== bFini) return aFini ? 1 : -1
      const ua = isUrgent(a) ? 1 : 0
      const ub = isUrgent(b) ? 1 : 0
      if (ub !== ua) return ub - ua
      return new Date(a.date_fin) - new Date(b.date_fin)
    })

  /* ── Skeleton pendant hydratation ── */
  if (isLoading) {
    return (
      <div className="w-full px-4 py-4">
        <div className="h-12 bg-[#F5F5F5] rounded-xl mb-4 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">

      {/* ── Bandeau ville ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F0F0] bg-white sticky top-0 z-30">
        <button
          onClick={() => setShowOverlay(true)}
          className="flex items-center gap-1.5 text-sm font-bold text-[#0A0A0A] hover:text-[#FF6B00] transition-colors min-h-[44px]"
        >
          <span>📍 {viewAll ? 'Toutes mes villes' : (ville || 'Ta ville')}</span>
          <span className="text-[#FF6B00] text-xs font-semibold">Changer ▼</span>
        </button>

        {ville && <VilleAbonnement villeNom={ville} />}
      </div>

      {/* ── Filtre multi-villes (si abonné à 2+) ─────────────────────────── */}
      {showMultiCityFilter && (
        <div
          className="flex gap-2 overflow-x-auto px-4 py-2.5 border-b border-[#F0F0F0] bg-[#FAFAFA]"
          style={{ scrollbarWidth: 'none' }}
        >
          <button
            onClick={() => setVilleFiltre(null)}
            className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full transition-colors whitespace-nowrap min-h-[32px] ${
              villeFiltre === null
                ? 'bg-[#FF6B00] text-white'
                : 'bg-[#F0F0F0] text-[#3D3D3D] hover:bg-[#FFF0E0] hover:text-[#FF6B00]'
            }`}
          >
            🏠 Toutes mes villes
          </button>
          {villesAbonnees.map(v => (
            <button
              key={v}
              onClick={() => setVilleFiltre(v)}
              className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full transition-colors whitespace-nowrap min-h-[32px] ${
                villeFiltre === v
                  ? 'bg-[#FF6B00] text-white'
                  : 'bg-[#F0F0F0] text-[#3D3D3D] hover:bg-[#FFF0E0] hover:text-[#FF6B00]'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      {/* ── Barre de filtres catégorie ────────────────────────────────────── */}
      <div
        className="flex gap-2 overflow-x-auto px-4 py-3 border-b border-[#F0F0F0]"
        style={{ scrollbarWidth: 'none' }}
      >
        {FILTERS.map(f => (
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

      {/* ── Grille d'offres ──────────────────────────────────────────────── */}
      <div className="px-4 py-6">
        {offresFiltrees.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {offresFiltrees.map(o => (
              <OffreCard key={o.id} offre={o} />
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

      {/* ── Overlay sélecteur de ville ───────────────────────────────────── */}
      <VilleSearchOverlay
        isOpen={showOverlay}
        onClose={() => setShowOverlay(false)}
        villesBonmoment={villes}
        onSelectActive={handleVilleSelect}
      />

    </div>
  )
}
