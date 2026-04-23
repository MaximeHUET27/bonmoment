'use client'

import { estClientDormant, formatDate } from '@/app/lib/fidelite/helpers'

export default function BadgeClientInactif({ dernierePassage, seuilJours = 60 }) {
  if (!estClientDormant(dernierePassage, seuilJours)) return null

  return (
    <span
      title={`Dernière visite : ${formatDate(dernierePassage)}`}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600 cursor-default"
    >
      🛌 Dormant
    </span>
  )
}
