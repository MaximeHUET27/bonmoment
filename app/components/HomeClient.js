'use client'

import { useState, useEffect } from 'react'
import SkeletonCard from './SkeletonCard'
import OffreCard, { getCategorieFiltre } from '@/app/ville/[slug]/OffreCard'

/* ── Barre de filtres ───────────────────────────────────────────────────── */

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
  return diff > 0 && (diff < 7200000 || offre.nb_bons_restants < 5)
}

/* ── Composant principal ────────────────────────────────────────────────── */

export default function HomeClient({ offres, villes }) {
  const [ville, setVille]                   = useState(null)
  const [filtre, setFiltre]                 = useState('tous')
  const [isLoading, setIsLoading]           = useState(true)
  const [showVilleDropdown, setShowVilleDropdown] = useState(false)
  const [abonnements, setAbonnements]       = useState([])

  /* Lecture localStorage côté client uniquement */
  useEffect(() => {
    const savedVille = localStorage.getItem('bonmoment_ville')
    if (savedVille) setVille(savedVille)
    try {
      const savedAbo = localStorage.getItem('bonmoment_abonnements')
      if (savedAbo) setAbonnements(JSON.parse(savedAbo))
    } catch {}
    setIsLoading(false)
  }, [])

  function selectVille(nom) {
    setVille(nom)
    localStorage.setItem('bonmoment_ville', nom)
    setShowVilleDropdown(false)
  }

  function toggleAbonnement() {
    if (!ville) return
    const next = abonnements.includes(ville)
      ? abonnements.filter(a => a !== ville)
      : [...abonnements, ville]
    setAbonnements(next)
    localStorage.setItem('bonmoment_abonnements', JSON.stringify(next))
  }

  /* Filtrage + tri par urgence décroissante */
  const offresFiltrees = (offres || [])
    .filter(o => {
      if (ville && o.commerces?.ville !== ville) return false
      if (filtre === 'tous') return true
      return getOffreFiltre(o) === filtre
    })
    .sort((a, b) => {
      const ua = isUrgent(a) ? 1 : 0
      const ub = isUrgent(b) ? 1 : 0
      if (ub !== ua) return ub - ua
      return new Date(a.date_fin) - new Date(b.date_fin)
    })

  const offresUrgentes = (offres || []).filter(o => {
    if (ville && o.commerces?.ville !== ville) return false
    return isUrgent(o)
  })

  const isAbonne = ville ? abonnements.includes(ville) : false

  /* ── Skeleton pendant hydratation ────────────────────────────────────── */
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

        {/* Sélecteur de ville */}
        <div className="relative">
          <button
            onClick={() => setShowVilleDropdown(v => !v)}
            className="flex items-center gap-1.5 text-sm font-bold text-[#0A0A0A] hover:text-[#FF6B00] transition-colors min-h-[44px]"
          >
            <span>📍 {ville || 'Ta ville'}</span>
            <span className="text-[#FF6B00] text-xs font-semibold">Changer ▼</span>
          </button>

          {showVilleDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowVilleDropdown(false)} />
              <div className="absolute left-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-xl border border-[#F0F0F0] py-2 min-w-[200px] max-h-64 overflow-y-auto">
                {(villes || []).map(v => (
                  <button
                    key={v.id}
                    onClick={() => selectVille(v.nom)}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#FFF0E0] transition-colors min-h-[44px] ${
                      ville === v.nom ? 'font-bold text-[#FF6B00]' : 'text-[#0A0A0A]'
                    }`}
                  >
                    {v.nom}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Bouton abonnement */}
        {ville && (
          <button
            onClick={toggleAbonnement}
            className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors min-h-[36px] ${
              isAbonne
                ? 'bg-[#FF6B00] text-white'
                : 'border border-[#FF6B00] text-[#FF6B00] hover:bg-[#FFF0E0]'
            }`}
          >
            {isAbonne ? '📌 Abonné ✓' : "📌 S'abonner à cette ville"}
          </button>
        )}
      </div>

      {/* ── Zone urgence ─────────────────────────────────────────────────── */}
      {offresUrgentes.length > 0 && (
        <div className="px-4 pt-5 pb-1">
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs rounded-full font-black">
              ⚡
            </span>
            À ne pas rater
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
            {offresUrgentes.map(o => (
              <div key={o.id} className="min-w-[240px] max-w-[240px] shrink-0">
                <OffreCard offre={o} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Barre de filtres ─────────────────────────────────────────────── */}
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
              Vos commerçants préparent des surprises...
            </p>
            <p className="text-[#3D3D3D]/60 text-sm mt-1">Revenez bientôt !</p>
          </div>
        )}
      </div>

    </div>
  )
}
