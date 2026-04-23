'use client'

import { useState } from 'react'
import { useFidelite } from '@/app/hooks/fidelite/useFidelite'
import { useToast } from '@/app/components/Toast'
import { normaliserTelephone, masquerTelephone } from '@/app/lib/fidelite/helpers'

export default function ModifierTelephoneModal({ telephoneActuel, onClose, onSuccess }) {
  const { modifierTelephone } = useFidelite()
  const { showToast } = useToast()

  const [nouveauTel,   setNouveauTel]   = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [erreur,       setErreur]       = useState(null)
  const [fusion,       setFusion]       = useState(null)

  const telNormalise  = normaliserTelephone(nouveauTel)
  const telValide     = telNormalise !== null
  const peutSoumettre = telValide && !isProcessing

  async function handleConfirmer() {
    if (!peutSoumettre) return
    setErreur(null)
    setFusion(null)
    setIsProcessing(true)
    try {
      const res = await modifierTelephone(telNormalise)
      const nbFusions = res?.cartes_fusionnees ?? 0
      if (nbFusions > 0) {
        setFusion(nbFusions)
        showToast(`🎉 ${nbFusions} carte${nbFusions > 1 ? 's' : ''} fusionnée${nbFusions > 1 ? 's' : ''} !`, 'success')
      } else {
        showToast('✅ Numéro mis à jour', 'success')
      }
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
            <p className="text-xl font-black text-gray-900">✏️ Modifier mon numéro</p>
            {telephoneActuel && (
              <p className="text-sm text-gray-400 mt-1 font-mono">
                Numéro actuel : {masquerTelephone(telephoneActuel)}
              </p>
            )}
          </div>

          {/* Info fusion */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
            <p className="text-xs text-blue-700 leading-relaxed">
              Toutes tes cartes fidélité seront conservées. Si tu as utilisé ce nouveau
              numéro chez un commerçant avant, tes tampons seront fusionnés automatiquement.
            </p>
          </div>

          {/* Champ nouveau numéro */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
              Nouveau numéro
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={14}
              value={nouveauTel}
              onChange={e => { setNouveauTel(e.target.value); setErreur(null) }}
              placeholder="06 12 34 56 78"
              className={[
                'border-2 rounded-xl px-4 py-3 text-sm outline-none transition-colors',
                nouveauTel.length > 0 && !telValide
                  ? 'border-red-300 focus:border-red-400'
                  : 'border-gray-200 focus:border-orange-400',
              ].join(' ')}
            />
            {nouveauTel.length > 0 && !telValide && (
              <p className="text-xs text-red-500">Numéro invalide (format 06 ou 07)</p>
            )}
          </div>

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
              onClick={handleConfirmer}
              disabled={!peutSoumettre}
              className="flex-[2] py-4 rounded-2xl bg-orange-500 text-white font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isProcessing
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : '✓ Confirmer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
