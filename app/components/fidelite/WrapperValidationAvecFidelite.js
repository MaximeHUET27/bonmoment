'use client'

import { useState } from 'react'
import { commercePeutUtiliserFidelite } from '@/app/lib/fidelite/helpers'
import ValidationFideliteTab from './ValidationFideliteTab'

export default function WrapperValidationAvecFidelite({
  ComposantOriginal,
  commerce,
  programme,
  ...props
}) {
  const [onglet, setOnglet] = useState('qr')

  // Garde-fou : palier pro + programme actif — si non, rendu transparent
  if (!commercePeutUtiliserFidelite(commerce) || !programme?.actif) {
    return <ComposantOriginal commerce={commerce} {...props} />
  }

  return (
    <div className="w-full">
      {/* Onglets */}
      <div className="flex border-b border-gray-200 mb-0">
        <button
          onClick={() => setOnglet('qr')}
          className={[
            'flex-1 py-3 text-sm font-bold transition-colors',
            onglet === 'qr'
              ? 'text-orange-500 border-b-2 border-orange-500 bg-white'
              : 'text-gray-400 hover:text-gray-600',
          ].join(' ')}
        >
          QR / Code
        </button>
        <button
          onClick={() => setOnglet('telephone')}
          className={[
            'flex-1 py-3 text-sm font-bold transition-colors',
            onglet === 'telephone'
              ? 'text-orange-500 border-b-2 border-orange-500 bg-white'
              : 'text-gray-400 hover:text-gray-600',
          ].join(' ')}
        >
          📱 Téléphone
        </button>
      </div>

      {/* Contenu */}
      {onglet === 'qr' && (
        <ComposantOriginal commerce={commerce} {...props} />
      )}
      {onglet === 'telephone' && (
        <ValidationFideliteTab
          commerceId={commerce?.id}
          programme={programme}
          onSuccess={props.onSuccess}
          onError={props.onError}
        />
      )}
    </div>
  )
}
