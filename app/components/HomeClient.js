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

const FILTERS_CATEGORIE = [
  { id: 'tous',     label: '🔥 Tous' },
  { id: 'resto',    label: '🍽️ Resto' },
  { id: 'beaute',   label: '💇 Beauté' },
  { id: 'shopping', label: '🛍️ Shopping' },
  { id: 'loisirs',  label: '🎮 Loisirs' },
  { id: 'autres',   label: '🏪 Autres' },
]

const FILTERS_TYPE = [
  { id: 'remise',        label: '💰 Remise' },
  { id: 'offerts',       label: '🎁 Offert' },
  { id: 'service',       label: '✂️ Service' },
  { id: 'atelier',       label: '🎨 Atelier' },
  { id: 'concours',      label: '🎰 Concours' },
]

function getOffreFiltre(offre) {
  // catégorie commerce
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
  return null
}

function matchFiltre(offre, filtre) {
  if (filtre === 'tous') return true
  if (FILTERS_TYPE.some(f => f.id === filtre)) return getTypeFiltre(offre) === filtre
  return getOffreFiltre(offre) === filtre
}

function isActive(offre) {
  return new Date(offre.date_fin) > new Date() && offre.nb_bons_restants !== 0
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
    setViewAll(false)
    localStorage.setItem('bonmoment_ville', nomVille)
    router.push(`/ville/${toSlug(nomVille)}`)
  }

  /* Quand l'utilisateur choisit "Toutes mes villes" dans l'overlay */
  function handleSelectAll() {
    setViewAll(true)
    setVille(null)
  }

  /* ── Filtrage ── */
  const offresFiltrees = (offres || [])
    .filter(o => {
      const villeOffre = o.commerces?.ville
      if (viewAll) {
        const villeOk = villesAbonnees.length === 0 || villesAbonnees.includes(villeOffre)
        if (!villeOk) return false
        if (!isActive(o)) return true  // offres expirées toujours visibles
        return matchFiltre(o, filtre)
      }
      if (ville && villeOffre !== ville) return false
      return matchFiltre(o, filtre)
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

  /* Offres actives dans le filtre courant (pour le banner viewAll) */
  const activesDansFiltreViewAll = viewAll && filtre !== 'tous'
    ? offresFiltrees.filter(isActive)
    : []

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
          <span>📍 {
            viewAll
              ? 'Toutes mes villes'
              : ville
              ? ville
              : (!user || villesAbonnees.length === 0)
              ? 'Choisir une ville'
              : villesAbonnees.length === 1
              ? villesAbonnees[0]
              : 'Toutes mes villes'
          }</span>
          <span className="text-[#FF6B00] text-xs font-semibold">Changer ▼</span>
        </button>

        {ville && <VilleAbonnement villeNom={ville} />}
      </div>

      {/* ── Barre de filtres ─────────────────────────────────────────────── */}
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

      {/* ── Grille d'offres ──────────────────────────────────────────────── */}
      <div className="px-4 py-6">
        {offresFiltrees.length > 0 ? (
          <>
            {viewAll && filtre !== 'tous' && activesDansFiltreViewAll.length === 0 && (
              <p className="text-sm font-semibold text-[#3D3D3D]/60 text-center mb-4">
                Pas de {[...FILTERS_CATEGORIE, ...FILTERS_TYPE].find(f => f.id === filtre)?.label.replace(/^\S+\s/, '')} en ce moment — tes commerçants préparent des surprises !
              </p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {offresFiltrees.map(o => (
                <OffreCard key={o.id} offre={o} />
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

      {/* ── Overlay sélecteur de ville ───────────────────────────────────── */}
      <VilleSearchOverlay
        isOpen={showOverlay}
        onClose={() => setShowOverlay(false)}
        villesBonmoment={villes}
        onSelectActive={handleVilleSelect}
        onSelectAll={handleSelectAll}
      />

    </div>
  )
}
