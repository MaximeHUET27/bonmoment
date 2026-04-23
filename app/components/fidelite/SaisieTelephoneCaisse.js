'use client'

import { useEffect, useRef, useState } from 'react'
import { normaliserTelephone } from '@/app/lib/fidelite/helpers'

function formaterAffichage(digits) {
  // "0612345678" → "06 12 34 56 78"
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim()
}

export default function SaisieTelephoneCaisse({ value, onChange, onValid }) {
  const [display, setDisplay] = useState(value ? formaterAffichage(value) : '')
  const [erreur, setErreur] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function handleChange(e) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10)
    setDisplay(formaterAffichage(raw))
    onChange(raw)

    if (raw.length === 10) {
      const norm = normaliserTelephone(raw)
      if (!norm) {
        setErreur('Numéro invalide — doit commencer par 06 ou 07')
      } else {
        setErreur(null)
        onValid?.(norm)
      }
    } else {
      setErreur(null)
    }
  }

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        placeholder="06 __ __ __ __"
        className={[
          'w-full text-3xl font-bold text-center tracking-widest px-4 py-5 rounded-2xl border-2 outline-none transition-colors',
          erreur
            ? 'border-red-400 bg-red-50 text-red-600'
            : 'border-gray-200 bg-gray-50 focus:border-orange-400 text-gray-900',
        ].join(' ')}
      />
      {erreur && (
        <p className="mt-2 text-sm text-red-500 text-center font-medium">{erreur}</p>
      )}
    </div>
  )
}
