'use client'

import { useEffect, useState } from 'react'
import { FIDELITE_ENABLED, commercePeutUtiliserFidelite } from '@/app/lib/fidelite/helpers'
import { useFidelite } from '@/app/hooks/fidelite/useFidelite'
import { estClientDormant } from '@/app/lib/fidelite/helpers'
import ConfigProgramme from './ConfigProgramme'
import HistoriquePassagesModal from './HistoriquePassagesModal'
import ModalAjustementManuel from './ModalAjustementManuel'
import JaugeRecompense from './JaugeRecompense'
import BadgeClientInactif from './BadgeClientInactif'
import BadgeRecompenseAttente from './BadgeRecompenseAttente'

const ONGLETS = [
  { id: 'base_client',       label: '👥 Base client' },
  { id: 'configuration',     label: '⚙️ Configuration' },
  { id: 'recompenses_attente', label: '🎁 Récompenses' },
]

export default function DashboardFideliteSection({ commerceId, commerce }) {
  if (!FIDELITE_ENABLED || !commercePeutUtiliserFidelite(commerce)) return null

  return <SectionInterne commerceId={commerceId} />
}

function SectionInterne({ commerceId }) {
  const [onglet,          setOnglet]          = useState('base_client')
  const [carteHistorique, setCarteHistorique] = useState(null)
  const [carteAjustement, setCarteAjustement] = useState(null)
  const [refreshKey,      setRefreshKey]      = useState(0)

  function handleOuvrirHistorique(client) {
    setCarteHistorique(client)
  }

  function handleOuvrirAjustement(carte) {
    setCarteAjustement(carte)
  }

  function handleSuccesAjustement() {
    setCarteAjustement(null)
    setRefreshKey(k => k + 1)
  }

  return (
    <div className="bg-white rounded-3xl px-6 py-6 flex flex-col gap-4 shadow-sm">
      <h2 className="text-sm font-black text-[#0A0A0A] uppercase tracking-wide">🎯 Ma carte fidélité</h2>

      <div className="flex border-b border-gray-200">
        {ONGLETS.map(o => (
          <button
            key={o.id}
            onClick={() => setOnglet(o.id)}
            className={[
              'flex-1 py-2.5 text-xs font-bold transition-colors',
              onglet === o.id
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-400 hover:text-gray-600',
            ].join(' ')}
          >
            {o.label}
          </button>
        ))}
      </div>

      {onglet === 'base_client' && (
        <ClientListeAvecAjustement
          key={refreshKey}
          commerceId={commerceId}
          onOuvrirHistorique={handleOuvrirHistorique}
          onOuvrirAjustement={handleOuvrirAjustement}
        />
      )}

      {onglet === 'configuration' && (
        <ConfigProgramme
          commerceId={commerceId}
          onSaved={() => setRefreshKey(k => k + 1)}
        />
      )}

      {onglet === 'recompenses_attente' && (
        <RecompensesAttenteTab
          commerceId={commerceId}
          onOuvrirHistorique={handleOuvrirHistorique}
          onOuvrirAjustement={handleOuvrirAjustement}
          refreshKey={refreshKey}
        />
      )}

      {carteHistorique && (
        <HistoriquePassagesModal
          carteId={carteHistorique.carte_id}
          client={carteHistorique}
          onClose={() => setCarteHistorique(null)}
        />
      )}

      {carteAjustement && (
        <ModalAjustementManuel
          carte={carteAjustement}
          onClose={() => setCarteAjustement(null)}
          onSuccess={handleSuccesAjustement}
        />
      )}
    </div>
  )
}

function ClientListeAvecAjustement({ commerceId, onOuvrirHistorique, onOuvrirAjustement }) {
  const { getBaseClientCommerce } = useFidelite()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [erreur,  setErreur]  = useState(null)

  useEffect(() => {
    let cancelled = false
    async function charger() {
      try {
        const data = await getBaseClientCommerce(commerceId, 365)
        if (!cancelled) setClients(data ?? [])
      } catch (e) {
        if (!cancelled) setErreur(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    charger()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commerceId])

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <span className="w-6 h-6 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (erreur) return <p className="text-sm text-red-500 py-4">{erreur}</p>
  if (clients.length === 0) return (
    <p className="text-sm text-gray-400 text-center py-8">
      Aucun client fidélité pour l&apos;instant. Commence à valider des passages !
    </p>
  )

  return (
    <div className="flex flex-col gap-2">
      {clients.map(client => (
        <div
          key={client.carte_id}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-2"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-gray-900 text-sm">{client.prenom_affiche ?? '—'}</span>
              <span className="text-xs text-gray-400 font-mono">{client.telephone_masque ?? '—'}</span>
            </div>
            <div className="flex flex-wrap gap-1 justify-end">
              <BadgeRecompenseAttente
                recompenseEnAttente={client.recompense_en_attente}
                descriptionRecompense={client.description_recompense}
              />
              <BadgeClientInactif dernierePassage={client.derniere_activite} />
            </div>
          </div>

          <JaugeRecompense
            nbPassages={client.nb_passages_depuis_derniere_recompense ?? 0}
            seuil={client.seuil_passages ?? 10}
            description={client.description_recompense ?? ''}
            animated={false}
          />

          <div className="flex gap-2 mt-1">
            <button
              onClick={() => onOuvrirHistorique(client)}
              className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 font-semibold text-xs hover:bg-gray-200 transition-colors"
            >
              📋 Historique
            </button>
            <button
              onClick={() => onOuvrirAjustement({
                id:                                     client.carte_id,
                nb_passages_depuis_derniere_recompense: client.nb_passages_depuis_derniere_recompense,
                seuil_passages_carte:                   client.seuil_passages,
                client_nom:                             client.prenom_affiche,
              })}
              className="flex-1 py-2 rounded-xl bg-orange-50 text-orange-600 font-semibold text-xs hover:bg-orange-100 transition-colors"
            >
              ✏️ Ajuster
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function RecompensesAttenteTab({ commerceId, onOuvrirHistorique, refreshKey }) {
  const { getClientsRecompenseEnAttente } = useFidelite()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function charger() {
      setLoading(true)
      try {
        const data = await getClientsRecompenseEnAttente(commerceId)
        if (!cancelled) setClients(data ?? [])
      } catch { /* silencieux */ }
      finally { if (!cancelled) setLoading(false) }
    }
    charger()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commerceId, refreshKey])

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <span className="w-6 h-6 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (clients.length === 0) return (
    <p className="text-sm text-gray-400 text-center py-8">
      Aucune récompense en attente. 🎉
    </p>
  )

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-orange-600 font-semibold">
        {clients.length} client{clients.length > 1 ? 's' : ''} avec une récompense à remettre
      </p>
      {clients.map(client => (
        <div
          key={client.carte_id}
          className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between gap-3"
        >
          <div>
            <p className="font-bold text-gray-900 text-sm">{client.prenom_affiche ?? '—'}</p>
            <p className="text-xs text-orange-700 mt-0.5">{client.description_recompense ?? 'Récompense'}</p>
          </div>
          <button
            onClick={() => onOuvrirHistorique(client)}
            className="shrink-0 px-3 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs"
          >
            Voir
          </button>
        </div>
      ))}
    </div>
  )
}
