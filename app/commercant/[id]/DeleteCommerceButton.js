'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'

/**
 * Bouton "Supprimer ce commerce" visible uniquement par le propriétaire.
 * Double confirmation avant suppression.
 */
export default function DeleteCommerceButton({ commerceId, ownerUserId }) {
  const { user, supabase } = useAuth()
  const router = useRouter()
  const [step,    setStep]    = useState(0) // 0=hidden, 1=confirm1, 2=confirm2
  const [loading, setLoading] = useState(false)
  const [toast,   setToast]   = useState(null)

  // N'affiche rien si l'utilisateur n'est pas le propriétaire
  if (!user || user.id !== ownerUserId) return null

  async function handleDelete() {
    setLoading(true)
    try {
      // Annule toutes les offres actives
      await supabase
        .from('offres')
        .update({ statut: 'annulee' })
        .eq('commerce_id', commerceId)
        .eq('statut', 'active')

      // Détache le commerce du propriétaire
      await supabase
        .from('commerces')
        .update({ abonnement_actif: false, owner_id: null })
        .eq('id', commerceId)

      setToast('Commerce supprimé de ton compte.')
      setTimeout(() => router.push('/'), 1500)
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
          className="mt-6 text-xs text-red-400 hover:text-red-600 transition-colors underline underline-offset-2"
        >
          🗑️ Supprimer ce commerce
        </button>
      )}

      {step === 1 && (
        <div className="mt-6 bg-red-50 border border-red-100 rounded-2xl px-4 py-4 flex flex-col gap-3">
          <p className="text-sm font-bold text-red-600">Supprimer ce commerce ?</p>
          <p className="text-xs text-[#3D3D3D]/60">
            Toutes les offres actives seront annulées et le commerce sera retiré de ton compte. Cette action est irréversible.
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
            Tu es sûr ? Cette action ne peut pas être annulée.
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

      {toast && (
        <div className="fixed bottom-8 left-4 right-4 z-50 bg-[#0A0A0A] text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl text-center">
          {toast}
        </div>
      )}
    </>
  )
}
