'use client'

import { useEffect, useState } from 'react'
import { useFidelite } from '@/app/hooks/fidelite/useFidelite'
import { formatDate } from '@/app/lib/fidelite/helpers'
import JaugeRecompense from './JaugeRecompense'

const MODE_LABEL = {
  qr:        '📸 QR code',
  code_6:    '🔢 Code 6 chiffres',
  telephone: '📱 Téléphone',
  manuel:    '✏️ Ajustement manuel',
}

// Regroupe les lignes passages par passage_group_id (N tampons = N lignes)
function grouperPassages(passages) {
  const map = new Map()
  for (const p of passages) {
    const key = p.passage_group_id ?? p.id
    if (!map.has(key)) {
      map.set(key, { ...p, nbTampons: 0 })
    }
    map.get(key).nbTampons++
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  )
}

export default function HistoriquePassagesModal({ carteId, client, onClose }) {
  const { getHistoriquePassages } = useFidelite()

  const [passages, setPassages] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [erreur,   setErreur]   = useState(null)

  useEffect(() => {
    let cancelled = false
    async function charger() {
      try {
        const data = await getHistoriquePassages(carteId)
        if (!cancelled) setPassages(data ?? [])
      } catch (e) {
        if (!cancelled) setErreur(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    charger()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carteId])

  const groupes = grouperPassages(passages)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Poignée mobile */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-4 sm:hidden flex-shrink-0" />

        {/* En-tête */}
        <div className="px-6 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
          <p className="text-xl font-black text-gray-900">
            {client?.prenom_affiche ?? 'Client'}
          </p>
          {client && (
            <div className="mt-2">
              <JaugeRecompense
                nbPassages={client.nb_passages_depuis_derniere_recompense ?? 0}
                seuil={client.seuil_passages ?? 10}
                description={client.description_recompense ?? ''}
                animated={false}
              />
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {passages.length} tampon{passages.length > 1 ? 's' : ''} actif{passages.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <span className="w-6 h-6 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {erreur && (
            <p className="text-sm text-red-500 text-center py-6">{erreur}</p>
          )}

          {!loading && !erreur && groupes.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Aucun passage enregistré.</p>
          )}

          {!loading && !erreur && groupes.map(g => (
            <div
              key={g.passage_group_id ?? g.id}
              className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0"
            >
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold text-gray-800">
                  {formatDate(g.created_at)}
                </p>
                <p className="text-xs text-gray-400">
                  {MODE_LABEL[g.mode_identification] ?? g.mode_identification}
                </p>
                {g.commentaire && (
                  <p className="text-xs text-gray-500 italic mt-0.5">{g.commentaire}</p>
                )}
              </div>
              <span className="text-sm font-black text-orange-500 shrink-0 ml-3">
                +{g.nbTampons} ⭐
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-8 pt-3 flex-shrink-0 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-4 rounded-2xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
