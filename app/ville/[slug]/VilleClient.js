'use client'

import { useState, useEffect } from 'react'
import OffreCard from './OffreCard'
import SkeletonCard from '@/app/components/SkeletonCard'
import { getCategorieFiltre } from './OffreCard'
import VilleAbonnement from '@/app/components/VilleAbonnement'

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

export default function VilleClient({ offres, villeNom }) {
  const [filtre,    setFiltre]    = useState('tous')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => { setIsLoading(false) }, [])

  /* Filtrage */
  const offresActives  = (offres || []).filter(isActive)
  const offresUrgentes = offresActives.filter(isUrgent)

  const offresAffichees = (offres || [])
    .filter(o => {
      if (filtre === 'tous') return true
      return getOffreFiltre(o) === filtre
    })
    .sort((a, b) => {
      // Actives en premier, triées par urgence décroissante, puis expirées
      const aActive = isActive(a) ? 1 : 0
      const bActive = isActive(b) ? 1 : 0
      if (bActive !== aActive) return bActive - aActive
      const aUrg = isUrgent(a) ? 1 : 0
      const bUrg = isUrgent(b) ? 1 : 0
      if (bUrg !== aUrg) return bUrg - aUrg
      return new Date(a.date_fin) - new Date(b.date_fin)
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F0F0] bg-white">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-black text-[#0A0A0A]">📍 {villeNom}</span>
          {offresActives.length > 0 && (
            <span className="text-[11px] text-[#3D3D3D]/50 font-medium">
              · {offresActives.length} bon{offresActives.length > 1 ? 's' : ''} en cours
            </span>
          )}
        </div>
        <VilleAbonnement villeNom={villeNom} />
      </div>

      {/* ── Zone urgence ── */}
      {offresUrgentes.length > 0 && (
        <div className="px-4 pt-5 pb-1">
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs rounded-full font-black">⚡</span>
            À ne pas rater
          </h2>
          <div
            className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4"
            style={{ scrollbarWidth: 'none' }}
          >
            {offresUrgentes.map(o => (
              <div key={o.id} className="min-w-[240px] max-w-[240px] shrink-0">
                <OffreCard offre={o} />
              </div>
            ))}
          </div>
        </div>
      )}

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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {offresAffichees.map(o => (
              <OffreCard key={o.id} offre={o} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">🕐</div>
            <p className="text-[#0A0A0A] font-black text-base">
              Vos commerçants préparent des surprises...
            </p>
            <p className="text-[#3D3D3D]/60 text-sm mt-1">Revenez bientôt !</p>
          </div>
        )}
      </div>

    </div>
  )
}
