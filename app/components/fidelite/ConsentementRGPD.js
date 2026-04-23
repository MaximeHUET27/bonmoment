'use client'

import { useState } from 'react'

export default function ConsentementRGPD({ checked, onChange, prenom = '', onPrenomChange }) {
  const [popover, setPopover] = useState(false)

  return (
    <div className="relative w-full flex flex-col gap-4">

      {/* Champ prénom facultatif */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
          Prénom <span className="font-normal normal-case text-gray-400">(facultatif)</span>
        </label>
        <input
          type="text"
          maxLength={100}
          value={prenom}
          onChange={e => onPrenomChange?.(e.target.value)}
          placeholder="Marie, Jean, Max H..."
          className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400"
        />
        <p className="text-xs text-gray-400 italic leading-relaxed">
          Ce prénom sera mis à jour automatiquement si le client crée un compte BONMOMENT avec ce numéro.
        </p>
      </div>

      {/* Checkbox consentement */}
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
