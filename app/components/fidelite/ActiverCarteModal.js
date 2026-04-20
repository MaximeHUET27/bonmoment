'use client'

import { useState } from 'react'
import { useFidelite } from '@/app/hooks/fidelite/useFidelite'
import { useToast } from '@/app/components/Toast'
import { normaliserTelephone } from '@/app/lib/fidelite/helpers'

export default function ActiverCarteModal({ onClose, onSuccess }) {
  const { activerCarte } = useFidelite()
  const { showToast } = useToast()

  const [telephone,    setTelephone]    = useState('')
  const [consent,      setConsent]      = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [erreur,       setErreur]       = useState(null)

  const telNormalise = normaliserTelephone(telephone)
  const telValide    = telNormalise !== null
  const peutSoumettre = telValide && consent && !isProcessing

  async function handleActiver() {
    if (!peutSoumettre) return
    setErreur(null)
    setIsProcessing(true)
    try {
      await activerCarte(telNormalise)
      showToast('🎉 Ta carte est activée !', 'success')
      onSuccess?.()
      onClose()
    } catch (e) {
      if (e.message?.toLowerCase().includes('déjà')) {
        setErreur('Ce numéro est déjà lié à un autre compte BONMOMENT.')
      } else {
        setErreur(e.message)
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-4 sm:hidden" />

        <div className="px-6 pt-5 pb-8 flex flex-col gap-5">
          {/* En-tête */}
          <div>
            <p className="text-xl font-black text-gray-900">🎯 Activer ma carte fidélité</p>
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
              En activant ta carte fidélité, tu pourras accumuler des tampons chez tous les
              commerçants BONMOMENT sur un seul numéro, sans app à installer.
            </p>
          </div>

          {/* Champ téléphone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
              Ton numéro de téléphone
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={14}
              value={telephone}
              onChange={e => { setTelephone(e.target.value); setErreur(null) }}
              placeholder="06 12 34 56 78"
              className={[
                'border-2 rounded-xl px-4 py-3 text-sm outline-none transition-colors',
                telephone.length > 0 && !telValide
                  ? 'border-red-300 focus:border-red-400'
                  : 'border-gray-200 focus:border-orange-400',
              ].join(' ')}
            />
            {telephone.length > 0 && !telValide && (
              <p className="text-xs text-red-500">Numéro invalide (format 06 ou 07)</p>
            )}
          </div>

          {/* Checkbox consentement */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={e => setConsent(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-orange-500 flex-shrink-0"
            />
            <span className="text-xs text-gray-600 leading-relaxed">
              Je comprends que mon numéro sera partagé avec les commerçants chez qui
              je valide un bon ou un tampon.
            </span>
          </label>

          {/* Message d'erreur */}
          {erreur && (
            <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-100 px-3 py-2.5 rounded-xl">
              ⚠️ {erreur}
            </p>
          )}

          {/* Boutons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold text-sm disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleActiver}
              disabled={!peutSoumettre}
              className="flex-[2] py-4 rounded-2xl bg-orange-500 text-white font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isProcessing
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : '✓ Activer ma carte'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
