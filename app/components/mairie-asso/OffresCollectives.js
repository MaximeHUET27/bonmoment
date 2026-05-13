'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

function formatDateCourt(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function OffresCollectives({ commerceId }) {
  const [offres,  setOffres]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/commercant/offres-collectives?commerce_id=${commerceId}`)
      .then(r => r.json())
      .then(data => { setOffres(data.offres || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [commerceId])

  if (loading) {
    return (
      <div className="bg-white rounded-3xl px-6 py-6 shadow-sm animate-pulse">
        <div className="h-4 w-44 bg-[#E0E0E0] rounded mb-4" />
        <div className="flex flex-col gap-3">
          <div className="h-10 bg-[#F5F5F5] rounded-2xl" />
          <div className="h-10 bg-[#F5F5F5] rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!offres.length) return null

  return (
    <div className="bg-white rounded-3xl px-6 py-6 flex flex-col gap-4 shadow-sm">
      <p className="text-sm font-black text-[#0A0A0A] uppercase tracking-wide">
        🏛️ Offres collectives
      </p>
      <div className="flex flex-col">
        {offres.map((offre, i) => (
          <Link
            key={offre.offre_id}
            href={`/offre/${offre.offre_id}`}
            className={`flex items-center justify-between gap-3 py-2.5 ${
              i < offres.length - 1 ? 'border-b border-[#F5F5F5]' : ''
            }`}
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-xs font-bold text-[#0A0A0A] truncate">
                {!offre.offre_avec_bon && '🎉 '}{offre.offre_titre}
              </span>
              <span className="text-[10px] text-[#3D3D3D]/60 truncate">
                {offre.asso_nom} · {formatDateCourt(offre.offre_date_debut)}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-[#FF6B00] shrink-0">
              Voir →
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
