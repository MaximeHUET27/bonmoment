'use client'

import { useState } from 'react'
import { useFidelite } from '@/app/hooks/fidelite/useFidelite'
import { useToast } from '@/app/components/Toast'

export default function DesactiverFideliteModal({ nbCartes, onClose, onConfirm }) {
  const { desactiverFidelite } = useFidelite()
  const { showToast } = useToast()

  const [consent,      setConsent]      = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  async function handleDesactiver() {
    if (!consent || isProcessing) return
    setIsProcessing(true)
    try {
      await desactiverFidelite()
      showToast('Carte fidélité désactivée.', 'success')
      onConfirm?.()
      onClose()
    } catch (e) {
      showToast(`😔 Erreur : ${e.message}`, 'erreur')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full flex flex-col gap-5">
        {/* Icône + titre */}
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-4xl">⚠️</span>
          <p className="text-lg font-black text-gray-900">Désactiver ma carte fidélité</p>
        </div>

        {/* Corps */}
        <p className="text-sm text-gray-600 leading-relaxed text-center">
          Tu es sur le point de désactiver ta carte fidélité universelle. Cela va
          supprimer tes{' '}
          <strong>{nbCartes ?? 0} carte{(nbCartes ?? 0) > 1 ? 's' : ''}</strong> et
          tous tes tampons accumulés.{' '}
          <span className="font-bold text-red-600">Cette action est irréversible.</span>
        </p>

        {/* Checkbox double confirmation */}
        <label className="flex items-start gap-3 cursor-pointer bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
          <input
            type="checkbox"
            checked={consent}
            onChange={e => setConsent(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-red-500 flex-shrink-0"
          />
          <span className="text-xs text-red-700 leading-relaxed font-medium">
            Je comprends que je vais perdre tous mes tampons.
          </span>
        </label>

        {/* Boutons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold text-sm disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleDesactiver}
            disabled={!consent || isProcessing}
            className="flex-[2] py-3.5 rounded-2xl bg-red-500 text-white font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {isProcessing
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : '✗ Désactiver définitivement'}
          </button>
        </div>
      </div>
    </div>
  )
}
