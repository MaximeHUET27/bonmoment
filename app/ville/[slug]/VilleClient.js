'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import OffreCard from './OffreCard'
import SkeletonCard from '@/app/components/SkeletonCard'
import { getCategorieFiltre } from './OffreCard'
import VilleAbonnement from '@/app/components/VilleAbonnement'
import VilleSearchOverlay from '@/app/components/VilleSearchOverlay'
import { toSlug } from '@/lib/utils'
import { getOffreStatus } from '@/lib/offreStatus'

/* ── Filtres ─────────────────────────────────────────────────────────────── */

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

function isActive(offre) {
  return new Date(offre.date_fin) > new Date() && offre.nb_bons_restants !== 0
}

function isUrgent(offre) {
  const diff = new Date(offre.date_fin) - new Date()
  return diff > 0 && (diff < 7_200_000 || (offre.nb_bons_restants !== null && offre.nb_bons_restants < 5))
}

/* ── Composant ────────────────────────────────────────────────────────────── */

export default function VilleClient({ offres, villeNom, villes = [] }) {
  const router = useRouter()
  const [filtre,      setFiltre]      = useState('tous')
  const [isLoading,   setIsLoading]   = useState(true)
  const [showOverlay, setShowOverlay] = useState(false)

  useEffect(() => { setIsLoading(false) }, [])

  function handleVilleSelect(nomVille) {
    router.push(`/ville/${toSlug(nomVille)}`)
  }

  /* Filtrage */
  const offresActives  = (offres || []).filter(isActive)
  const activesDansFiltre = filtre === 'tous'
    ? offresActives
    : offresActives.filter(o => getOffreFiltre(o) === filtre)

  const STATUS_ORDER = { en_cours: 0, programmee: 1, expiree: 2 }

  const offresAffichees = (offres || [])
    .filter(o => {
      if (filtre === 'tous') return true
      if (!isActive(o)) return true  // les offres expirées restent visibles peu importe le filtre
      return getOffreFiltre(o) === filtre
    })
    .sort((a, b) => {
      // EN COURS (date_fin croissante) → PROGRAMMÉES (date_debut croissante) → EXPIRÉES (date_fin décroissante)
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
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">

      {/* ── Bandeau ville + abonnement ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F0F0] bg-white sticky top-0 z-30">
        <button
          onClick={() => setShowOverlay(true)}
          className="flex items-center gap-1.5 text-sm font-bold text-[#0A0A0A] hover:text-[#FF6B00] transition-colors min-h-[44px]"
        >
          <span>📍 {villeNom}</span>
          <span className="text-[#FF6B00] text-xs font-semibold">Changer ▼</span>
        </button>
        <VilleAbonnement villeNom={villeNom} />
      </div>

      {/* ── Barre de filtres ── */}
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

      {/* ── Grille d'offres ── */}
      <div className="px-4 py-6">
        {offresAffichees.length > 0 ? (
          <>
            {filtre !== 'tous' && activesDansFiltre.length === 0 && (
              <p className="text-sm font-semibold text-[#3D3D3D]/60 text-center mb-4">
                Pas de {FILTERS.find(f => f.id === filtre)?.label.replace(/^\S+\s/, '')} en ce moment — tes commerçants préparent des surprises !
              </p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {offresAffichees.map(o => (
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

      {/* ── Overlay sélecteur de ville ── */}
      <VilleSearchOverlay
        isOpen={showOverlay}
        onClose={() => setShowOverlay(false)}
        villesBonmoment={villes}
        onSelectActive={handleVilleSelect}
      />

    </div>
  )
}
