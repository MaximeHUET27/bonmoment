'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toSlug } from '@/lib/utils'

export default function VilleSelector({ villes }) {
  const [selected, setSelected] = useState('')
  const router = useRouter()

  function handleChange(e) {
    const val = e.target.value
    setSelected(val)
    if (val) {
      router.push(`/ville/${val}`)
    }
  }

  return (
    <div className="w-full max-w-xs">
      <label className="block text-xs font-semibold text-[#3D3D3D] mb-3 uppercase tracking-widest">
        Choisis ta ville
      </label>
      <div className="relative">
        <select
          value={selected}
          onChange={handleChange}
          className="w-full px-5 py-3.5 rounded-full border-2 border-[#FF6B00] text-[#0A0A0A] font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30 cursor-pointer appearance-none text-center pr-10"
        >
          <option value="">— Sélectionner —</option>
          {villes.map(v => (
            <option key={v.id} value={toSlug(v.nom)}>
              {v.nom}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#FF6B00]">
          ▾
        </span>
      </div>
    </div>
  )
}
