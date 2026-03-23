'use client'

import { useState } from 'react'
import { useAuth } from '@/app/context/AuthContext'

export default function DeleteCommerceButton({ commerceId, commerceNom, ownerUserId }) {
  const { user, supabase } = useAuth()
  const [step,    setStep]    = useState(0)
  const [loading, setLoading] = useState(false)

  if (!user || user.id !== ownerUserId) return null

  async function handleDelete() {
    setLoading(true)
    try {
      // a. Annule toutes les offres actives
      await supabase
        .from('offres')
        .update({ statut: 'annulee' })
        .eq('commerce_id', commerceId)
        .eq('statut', 'active')

      // b. Détache le commerce du propriétaire
      await supabase
        .from('commerces')
        .update({ abonnement_actif: false, owner_id: null })
        .eq('id', commerceId)

      // c. Vérifie les commerces restants
      const { data: restants } = await supabase
        .from('commerces')
        .select('id')
        .eq('owner_id', user.id)

      // d/e. Redirect hard pour forcer le rafraîchissement du menu
      if (!restants || restants.length === 0) {
        window.location.href = '/'
      } else {
        window.location.href = `/commercant/dashboard?commerce=${restants[0].id}`
      }
    } catch {
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
