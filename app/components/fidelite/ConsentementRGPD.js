'use client'

import { useState } from 'react'

export default function ConsentementRGPD({ checked, onChange }) {
  const [popover, setPopover] = useState(false)

  return (
    <div className="relative w-full">
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="mt-0.5 w-5 h-5 rounded accent-orange-500 flex-shrink-0 cursor-pointer"
        />
        <span className="text-sm text-gray-700 leading-snug">
          Je confirme au client que ses données sont enregistrées chez BONMOMENT
          pour sa carte fidélité.{' '}
          <button
            type="button"
            onClick={() => setPopover(v => !v)}
            className="text-orange-500 underline font-semibold"
          >
            Voir détails
          </button>
        </span>
      </label>

      {popover && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 z-20">
          <button
            type="button"
            onClick={() => setPopover(false)}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-base leading-none font-bold"
          >
            ✕
          </button>
          <p className="font-bold text-gray-800 mb-2 text-sm">Données collectées</p>
          <ul className="space-y-1 list-disc list-inside text-xs text-gray-600">
            <li>Numéro de téléphone 06/07</li>
            <li>Prénom (optionnel)</li>
            <li>Historique de passages (anonymisé)</li>
          </ul>
          <p className="mt-3 text-xs text-gray-400 leading-relaxed">
            Conformément au RGPD, le client peut demander la suppression à tout moment
            depuis son profil BONMOMENT ou en contactant le commerce.
          </p>
        </div>
      )}
    </div>
  )
}
