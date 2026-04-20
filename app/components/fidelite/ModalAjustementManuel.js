'use client'

import { useState } from 'react'
import { useFidelite } from '@/app/hooks/fidelite/useFidelite'
import { useToast } from '@/app/components/Toast'

export default function ModalAjustementManuel({ carte, onClose, onSuccess }) {
  const { ajusterTamponsManuel } = useFidelite()
  const { showToast } = useToast()

  const [sens,         setSens]         = useState('ajouter')   // 'ajouter' | 'retirer'
  const [nb,           setNb]           = useState(1)
  const [raison,       setRaison]       = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const nbActuel   = carte?.nb_passages_depuis_derniere_recompense ?? 0
  const seuil      = carte?.seuil_passages_carte ?? 10
  const prenom     = carte?.client_nom ?? 'Client'
  const carteId    = carte?.id

  const maxRetrait = Math.max(1, nbActuel)
  const nbEffectif = sens === 'ajouter' ? nb : -nb

  const nbApres    = Math.max(0, nbActuel + nbEffectif)
  const franchit   = sens === 'ajouter' && nbApres >= seuil && nbActuel < seuil
  const nbRecompenses = sens === 'ajouter' && seuil > 0 ? Math.floor(nbApres / seuil) : 0

  const raisonValide = raison.trim().length >= 5

  // Clamp nb selon le mode
  function handleNbChange(val) {
    const max = sens === 'ajouter' ? 10 : maxRetrait
    setNb(Math.min(max, Math.max(1, val)))
  }
  function handleSensChange(nouveauSens) {
    setSens(nouveauSens)
    setNb(1)
  }

  async function handleConfirmer() {
    if (!raisonValide || isProcessing) return
    setIsProcessing(true)
    try {
      await ajusterTamponsManuel({
        carteId,
        nbTampons:   nbEffectif,
        commentaire: raison.trim(),
      })
      showToast('✅ Ajustement enregistré', 'success')
      onSuccess?.()
      onClose()
    } catch (e) {
      showToast(`😔 Erreur : ${e.message}`, 'erreur')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-4 sm:hidden" />

        <div className="px-6 pt-4 pb-8 flex flex-col gap-5">
          {/* En-tête */}
          <div>
            <p className="text-xl font-black text-gray-900">
              {prenom}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              Progression actuelle : <span className="font-bold text-gray-700">{nbActuel}/{seuil}</span> tampons
            </p>
          </div>

          {/* Sélecteur sens */}
          <div className="flex gap-2">
            <button
              onClick={() => handleSensChange('ajouter')}
              className={[
                'flex-1 py-3 rounded-2xl font-bold text-sm transition-colors',
                sens === 'ajouter'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
              ].join(' ')}
            >
              ➕ Ajouter
            </button>
            <button
              onClick={() => handleSensChange('retirer')}
              className={[
                'flex-1 py-3 rounded-2xl font-bold text-sm transition-colors',
                sens === 'retirer'
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
              ].join(' ')}
            >
              ➖ Retirer
            </button>
          </div>

          {/* Sélecteur nombre */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nombre de tampons</p>
            <div className="flex items-center gap-6">
              <button
                onClick={() => handleNbChange(nb - 1)}
                disabled={nb <= 1}
                className="w-14 h-14 rounded-2xl bg-gray-100 text-2xl font-black text-gray-700 disabled:opacity-30"
                style={{ minWidth: 48, minHeight: 48 }}
              >
                −
              </button>
              <span className="text-4xl font-black text-gray-900 w-10 text-center">{nb}</span>
              <button
                onClick={() => handleNbChange(nb + 1)}
                disabled={nb >= (sens === 'ajouter' ? 10 : maxRetrait)}
                className="w-14 h-14 rounded-2xl bg-orange-100 text-2xl font-black text-orange-600 disabled:opacity-30"
                style={{ minWidth: 48, minHeight: 48 }}
              >
                +
              </button>
            </div>
          </div>

          {/* Champ raison */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
              Raison <span className="font-normal normal-case text-gray-400">(min. 5 caractères)</span>
            </label>
            <input
              type="text"
              maxLength={100}
              value={raison}
              onChange={e => setRaison(e.target.value)}
              placeholder={sens === 'ajouter' ? 'Achat important non enregistré' : 'Erreur de validation'}
              className={[
                'border-2 rounded-xl px-4 py-3 text-sm outline-none transition-colors',
                raison.length > 0 && !raisonValide
                  ? 'border-red-300 focus:border-red-400'
                  : 'border-gray-200 focus:border-orange-400',
              ].join(' ')}
            />
            {raison.length > 0 && !raisonValide && (
              <p className="text-xs text-red-500">Minimum 5 caractères requis.</p>
            )}
          </div>

          {/* Aperçu */}
          <div className="bg-gray-50 rounded-2xl p-3 text-sm text-center">
            <p className="text-gray-500">
              Progression après ajustement :
              {' '}<span className="font-black text-gray-900">{nbApres % seuil}/{seuil}</span>
            </p>
            {nbRecompenses > 0 && (
              <p className="text-orange-600 font-bold mt-1 text-xs">
                🎉 {nbRecompenses} récompense{nbRecompenses > 1 ? 's' : ''} débloquée{nbRecompenses > 1 ? 's' : ''} !
              </p>
            )}
            {sens === 'retirer' && nbActuel === 0 && (
              <p className="text-gray-400 text-xs mt-1">Aucun tampon à retirer.</p>
            )}
          </div>

          {/* Boutons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold text-sm disabled:opacity-50"
            >
              ✗ Annuler
            </button>
            <button
              onClick={handleConfirmer}
              disabled={!raisonValide || isProcessing || (sens === 'retirer' && nbActuel === 0)}
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
