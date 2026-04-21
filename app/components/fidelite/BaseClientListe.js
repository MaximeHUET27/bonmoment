'use client'

import { useEffect, useState } from 'react'
import { useFidelite } from '@/app/hooks/fidelite/useFidelite'
import { estClientDormant } from '@/app/lib/fidelite/helpers'
import JaugeRecompense from './JaugeRecompense'
import BadgeClientInactif from './BadgeClientInactif'
import BadgeRecompenseAttente from './BadgeRecompenseAttente'
import HistoriquePassagesModal from './HistoriquePassagesModal'

const FILTRES = [
  { id: 'tous',        label: 'Tous' },
  { id: 'actifs',      label: 'Actifs récents' },
  { id: 'dormants',    label: 'Dormants' },
  { id: 'recompenses', label: '🎁 Récompense' },
]

const TRIS = [
  { id: 'activite', label: 'Dernier passage' },
  { id: 'tampons',  label: 'Nb tampons' },
  { id: 'nom',      label: 'Nom' },
]

function appliquerFiltre(clients, filtre) {
  switch (filtre) {
    case 'actifs':      return clients.filter(c => !estClientDormant(c.derniere_activite))
    case 'dormants':    return clients.filter(c => estClientDormant(c.derniere_activite))
    case 'recompenses': return clients.filter(c => c.recompense_en_attente)
    default:            return clients
  }
}

function appliquerTri(clients, tri) {
  return [...clients].sort((a, b) => {
    if (tri === 'tampons') return (b.nb_passages_total ?? 0) - (a.nb_passages_total ?? 0)
    if (tri === 'nom')     return (a.prenom_affiche ?? '').localeCompare(b.prenom_affiche ?? '', 'fr')
    // activite (défaut)
    return new Date(b.derniere_activite) - new Date(a.derniere_activite)
  })
}

export default function BaseClientListe({ commerceId }) {
  const { getBaseClientCommerce } = useFidelite()

  const [clients,        setClients]        = useState([])
  const [loading,        setLoading]        = useState(true)
  const [erreur,         setErreur]         = useState(null)
  const [filtre,         setFiltre]         = useState('tous')
  const [tri,            setTri]            = useState('activite')
  const [clientSelecId,  setClientSelecId]  = useState(null)
  const [clientSelec,    setClientSelec]    = useState(null)

  useEffect(() => {
    let cancelled = false
    async function charger() {
      setLoading(true)
      setErreur(null)
      try {
        // 365 jours pour inclure les clients dormants
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

  const affichables = appliquerTri(appliquerFiltre(clients, filtre), tri)

  function ouvrirHistorique(client) {
    setClientSelec(client)
    setClientSelecId(client.carte_id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="w-7 h-7 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (erreur) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-600">
        {erreur}
      </div>
    )
  }

  return (
    <>
      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {FILTRES.map(f => (
          <button
            key={f.id}
            onClick={() => setFiltre(f.id)}
            className={[
              'px-3 py-1.5 rounded-full text-xs font-bold transition-colors',
              filtre === f.id
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            ].join(' ')}
          >
            {f.label}
            {f.id === 'tous'        && ` (${clients.length})`}
            {f.id === 'recompenses' && ` (${clients.filter(c => c.recompense_en_attente).length})`}
          </button>
        ))}
      </div>

      {/* Tri */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs text-gray-400 font-medium">Trier par :</span>
        {TRIS.map(t => (
          <button
            key={t.id}
            onClick={() => setTri(t.id)}
            className={[
              'px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors',
              tri === t.id
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="mt-3 flex flex-col gap-2">
        {affichables.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            {clients.length === 0
              ? "Aucun client fidélité pour l'instant. Commence à valider des passages !"
              : 'Aucun client dans ce filtre.'}
          </p>
        ) : (
          affichables.map(client => (
            <button
              key={client.carte_id}
              onClick={() => ouvrirHistorique(client)}
              className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-orange-200 hover:shadow-md transition-all flex flex-col gap-2"
            >
              {/* Ligne haute : prénom + badges */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-gray-900 text-sm leading-tight">
                    {client.prenom_affiche
                      ? `${client.prenom_affiche} — ${client.telephone_masque ?? ''}`
                      : (client.telephone_masque ?? '—')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  <BadgeRecompenseAttente
                    recompenseEnAttente={client.recompense_en_attente}
                    descriptionRecompense={client.description_recompense}
                  />
                  <BadgeClientInactif dernierePassage={client.derniere_activite} />
                </div>
              </div>

              {/* Jauge mini */}
              <JaugeRecompense
                nbPassages={client.nb_passages_depuis_derniere_recompense ?? 0}
                seuil={client.seuil_passages ?? 10}
                description={client.description_recompense ?? ''}
                animated={false}
              />

              {/* Ligne basse : total passages */}
              <p className="text-xs text-gray-400">
                {client.nb_passages_total ?? 0} passage{(client.nb_passages_total ?? 0) > 1 ? 's' : ''} au total
                {client.nb_recompenses_debloquees > 0 && ` · ${client.nb_recompenses_debloquees} récompense${client.nb_recompenses_debloquees > 1 ? 's' : ''} débloquée${client.nb_recompenses_debloquees > 1 ? 's' : ''}`}
              </p>
            </button>
          ))
        )}
      </div>

      {/* Modal historique */}
      {clientSelecId && (
        <HistoriquePassagesModal
          carteId={clientSelecId}
          client={clientSelec}
          onClose={() => { setClientSelecId(null); setClientSelec(null) }}
        />
      )}
    </>
  )
}
