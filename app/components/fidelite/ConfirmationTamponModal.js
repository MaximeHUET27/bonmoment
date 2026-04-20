'use client'

import { useEffect, useState } from 'react'
import { useFidelite } from '@/app/hooks/fidelite/useFidelite'
import JaugeRecompense from './JaugeRecompense'

export default function ConfirmationTamponModal({
  commerceId,
  mode,
  identifierValue,
  prenomOptionnel,
  onConfirm,
  onCancel,
  // props optionnelles transmises par le parent si disponibles
  seuilFallback = 10,
  descriptionFallback = 'Récompense',
  regleTampons = null,
}) {
  const { enregistrerPassage, confirmerRecompenseRemise } = useFidelite()
  const [consultation, setConsultation]     = useState(null)
  const [loadingConsult, setLoadingConsult] = useState(true)
  const [nbTampons, setNbTampons]           = useState(1)
  const [busy, setBusy]                     = useState(false)

  useEffect(() => {
    let cancelled = false
    async function consulter() {
      try {
        const res = await enregistrerPassage({
          commerceId,
          mode,
          identifierValue,
          prenomOptionnel,
          modeConsultation: true,
          nbTampons: 1,
        })
        if (!cancelled) setConsultation(res)
      } catch {
        if (!cancelled) setConsultation(null)
      } finally {
        if (!cancelled) setLoadingConsult(false)
      }
    }
    consulter()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const prenom      = consultation?.client_prenom ?? prenomOptionnel ?? null
  const nbActuel    = consultation?.nb_passages_depuis_recompense ?? 0
  const seuil       = consultation?.seuil_passages ?? seuilFallback
  const description = consultation?.description_recompense ?? descriptionFallback
  const recompEnAtt = consultation?.recompense_en_attente ?? false
  const carteId     = consultation?.carte_id ?? null

  const nbApres     = nbActuel + nbTampons
  const nbRecompApres = seuil > 0 ? Math.floor(nbApres / seuil) : 0
  const nbApresModulo = seuil > 0 ? nbApres % seuil : 0

  async function handleConfirmerRecompenseEnAttente() {
    if (!carteId || busy) return
    setBusy(true)
    try {
      await confirmerRecompenseRemise(carteId)
      setConsultation(prev => prev ? { ...prev, recompense_en_attente: false } : prev)
    } catch { /* non-bloquant */ }
    finally { setBusy(false) }
  }

  async function handleConfirmer() {
    if (busy) return
    setBusy(true)
    try {
      await onConfirm({ commerceId, mode, identifierValue, prenomOptionnel, nbTampons })
    } finally {
      setBusy(false)
    }
  }

  if (loadingConsult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-3xl p-8 flex flex-col items-center gap-3 shadow-2xl">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Chargement du client…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Poignée mobile */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-4 sm:hidden" />

        <div className="px-6 pt-4 pb-8 flex flex-col gap-5">
          {/* Prénom client */}
          <div className="text-center">
            <p className="text-3xl font-black text-gray-900">
              {prenom ? `👋 ${prenom}` : '👤 Client'}
            </p>
          </div>

          {/* Alerte récompense en attente */}
          {recompEnAtt && (
            <div className="bg-orange-50 border-2 border-orange-400 rounded-2xl p-4">
              <p className="text-sm font-bold text-orange-700 leading-snug">
                ⚠️ Récompense en attente : {description}. Pense à la remettre !
              </p>
              <button
                onClick={handleConfirmerRecompenseEnAttente}
                disabled={busy}
                className="mt-3 w-full bg-orange-500 text-white text-sm font-bold py-2 rounded-xl disabled:opacity-50"
              >
                ✓ Marquer comme remise maintenant
              </button>
            </div>
          )}

          {/* Règle tampons */}
          {regleTampons && (
            <p className="text-xs text-gray-400 italic text-center">{regleTampons}</p>
          )}

          {/* Sélecteur tampons */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm font-semibold text-gray-600">Nombre de tampons</p>
            <div className="flex items-center gap-6">
              <button
                onClick={() => setNbTampons(n => Math.max(1, n - 1))}
                className="w-14 h-14 rounded-2xl bg-gray-100 text-2xl font-black text-gray-700 flex items-center justify-center active:bg-gray-200 transition-colors"
                style={{ minWidth: 48, minHeight: 48 }}
              >
                −
              </button>
              <span className="text-4xl font-black text-gray-900 w-10 text-center">{nbTampons}</span>
              <button
                onClick={() => setNbTampons(n => Math.min(10, n + 1))}
                className="w-14 h-14 rounded-2xl bg-orange-100 text-2xl font-black text-orange-600 flex items-center justify-center active:bg-orange-200 transition-colors"
                style={{ minWidth: 48, minHeight: 48 }}
              >
                +
              </button>
            </div>
          </div>

          {/* Progression */}
          <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-3">
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Progression actuelle</p>
              <JaugeRecompense nbPassages={nbActuel} seuil={seuil} description={description} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Après ce passage</p>
              <JaugeRecompense nbPassages={nbApresModulo} seuil={seuil} description={description} />
            </div>
            {nbRecompApres > 0 && (
              <p className="text-sm font-bold text-orange-600 text-center mt-1">
                🎉 Ce passage débloque {nbRecompApres} récompense{nbRecompApres > 1 ? 's' : ''} !
              </p>
            )}
          </div>

          {/* Boutons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={busy}
              className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold text-sm disabled:opacity-50"
            >
              ✗ Annuler
            </button>
            <button
              onClick={handleConfirmer}
              disabled={busy}
              className="flex-[2] py-4 rounded-2xl bg-orange-500 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : '✓ Confirmer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
