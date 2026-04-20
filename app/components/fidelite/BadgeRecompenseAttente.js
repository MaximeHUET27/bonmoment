'use client'

export default function BadgeRecompenseAttente({ recompenseEnAttente, descriptionRecompense }) {
  if (!recompenseEnAttente) return null

  return (
    <span
      title={descriptionRecompense ?? 'Récompense à remettre'}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-600 cursor-default animate-pulse"
    >
      🎁 Récompense à remettre
    </span>
  )
}
