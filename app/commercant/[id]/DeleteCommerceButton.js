'use client'

import { useState } from 'react'
import { useAuth } from '@/app/context/AuthContext'

export default function DeleteCommerceButton({ commerceId, commerceNom, ownerUserId }) {
  const { user } = useAuth()
  const [step,    setStep]    = useState(0)
  const [loading, setLoading] = useState(false)

  if (!user || user.id !== ownerUserId) return null

  async function handleDelete() {
    setLoading(true)
    try {
      const res = await fetch('/api/commerce/supprimer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commerceId })
      })
      const result = await res.json()

      if (!res.ok) {
        console.error('Erreur suppression:', result.error)
        alert('Erreur : ' + result.error)
        setLoading(false)
        setStep(0)
        return
      }

      // Succès — redirect
      window.location.href = '/'
    } catch (err) {
      console.error('Erreur:', err)
      setLoading(false)
      setStep(0)
    }
  }

  return (
    <>
      {step === 0 && (
        <button
          onClick={() => setStep(1)}
          className="w-full text-center text-xs text-red-400 hover:text-red-600 transition-colors mt-6 mb-2"
        >
          🗑️ Supprimer ce commerce de mon compte
        </button>
      )}

      {step === 1 && (
        <div className="mt-6 bg-red-50 border border-red-100 rounded-2xl px-4 py-4 flex flex-col gap-3">
          <p className="text-sm font-bold text-red-600">
            Tu veux vraiment supprimer {commerceNom ? `« ${commerceNom} »` : 'ce commerce'} ?
          </p>
          <p className="text-xs text-[#3D3D3D]/60">
            Cette action est irréversible. Toutes les offres actives seront annulées.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setStep(0)}
              className="flex-1 border border-[#E0E0E0] text-sm font-semibold py-2.5 rounded-xl"
            >
              Annuler
            </button>
            <button
              onClick={() => setStep(2)}
              className="flex-1 bg-red-500 text-white text-sm font-bold py-2.5 rounded-xl"
            >
              Continuer →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-2xl px-4 py-4 flex flex-col gap-3">
          <p className="text-sm font-black text-red-700">Dernière confirmation</p>
          <p className="text-xs text-[#3D3D3D]/60">
            Cette action ne peut pas être annulée. Le commerce sera définitivement retiré de ton compte.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setStep(0)}
              className="flex-1 border border-[#E0E0E0] text-sm font-semibold py-2.5 rounded-xl"
            >
              Non, garder
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 bg-red-600 text-white text-sm font-bold py-2.5 rounded-xl flex items-center justify-center"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : 'Oui, supprimer'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
