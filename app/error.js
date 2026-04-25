'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('🚨 Erreur globale (app/error.js):', error)
    console.error('Message:', error?.message)
    console.error('Stack:', error?.stack)
    console.error('Digest:', error?.digest)
  }, [error])
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <p className="text-4xl mb-4">😕</p>
      <h1 className="text-[#0A0A0A] font-black text-xl mb-2">
        Oups, quelque chose a mal tourné
      </h1>
      <p className="text-[#3D3D3D] text-sm mb-6 max-w-sm">
        Une erreur inattendue est survenue. Réessaie dans quelques instants.
      </p>
      <button
        onClick={() => reset()}
        className="bg-[#FF6B00] hover:bg-[#CC5500] text-white font-bold text-sm px-6 py-3 rounded-full transition-colors min-h-[44px]"
      >
        Réessayer
      </button>
    </div>
  )
}
