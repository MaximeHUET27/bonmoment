'use client'

import { useEffect, useState } from 'react'
import { calculerProgression, messageEncouragement } from '@/app/lib/fidelite/helpers'

export default function JaugeRecompense({ nbPassages, seuil, description, animated = false }) {
  const cible = calculerProgression(nbPassages, seuil)
  const [width, setWidth] = useState(animated ? 0 : cible)

  useEffect(() => {
    if (!animated) {
      setWidth(cible)
      return
    }
    const t = setTimeout(() => setWidth(cible), 50)
    return () => clearTimeout(t)
  }, [animated, cible])

  return (
    <div className="w-full">
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-orange-500 rounded-full"
          style={{
            width: `${width}%`,
            transition: animated ? 'width 600ms ease-out' : 'none',
          }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5 gap-2">
        <span className="text-sm font-bold text-gray-700 shrink-0">
          {nbPassages}/{seuil}
        </span>
        <span className="text-xs text-gray-500 text-right leading-snug">
          {messageEncouragement(nbPassages, seuil, description)}
        </span>
      </div>
    </div>
  )
}
