'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FIDELITE_ENABLED } from '@/app/lib/fidelite/helpers'
import { masquerTelephone } from '@/app/lib/fidelite/helpers'
import { useFidelite } from '@/app/hooks/fidelite/useFidelite'
import ActiverCarteModal from './ActiverCarteModal'
import ModifierTelephoneModal from './ModifierTelephoneModal'
import DesactiverFideliteModal from './DesactiverFideliteModal'
import JaugeRecompense from './JaugeRecompense'
import BadgeRecompenseAttente from './BadgeRecompenseAttente'
import HistoriquePassagesModal from './HistoriquePassagesModal'

const supabase = createClient()

export default function ProfilCarteFidelite({ user }) {
  if (!FIDELITE_ENABLED || !user?.id) return null

  return <ProfilFideliteInterne userId={user.id} />
}

function ProfilFideliteInterne({ userId }) {
  const { getCartesClient } = useFidelite()

  const [profil,         setProfil]         = useState(null)   // { telephone, nom }
  const [cartes,         setCartes]         = useState([])
  const [loadingProfil,  setLoadingProfil]  = useState(true)
  const [loadingCartes,  setLoadingCartes]  = useState(true)
  const [erreur,         setErreur]         = useState(null)

  const [modalActiver,    setModalActiver]    = useState(false)
  const [modalModifier,   setModalModifier]   = useState(false)
  const [modalDesactiver, setModalDesactiver] = useState(false)
  const [carteHistorique, setCarteHistorique] = useState(null)

  async function chargerProfil() {
    setLoadingProfil(true)
    const { data } = await supabase
      .from('users')
      .select('telephone, nom')
      .eq('id', userId)
      .single()
    setProfil(data ?? { telephone: null, nom: null })
    setLoadingProfil(false)
  }

  async function chargerCartes() {
    setLoadingCartes(true)
    setErreur(null)
    try {
      const data = await getCartesClient(userId)
      setCartes(data ?? [])
    } catch (e) {
      setErreur(e.message)
    } finally {
      setLoadingCartes(false)
    }
  }

  useEffect(() => {
    chargerProfil()
    chargerCartes()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  function handleSuccesActivation() {
    chargerProfil()
    chargerCartes()
  }

  function handleSuccesModification() {
    chargerProfil()
  }

  function handleSuccesDesactivation() {
    setProfil(p => ({ ...p, telephone: null }))
    setCartes([])
  }

  if (loadingProfil) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide">🎯 Carte fidélité</h2>
        <div className="flex items-center justify-center py-8">
          <span className="w-6 h-6 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </section>
    )
  }

  // ── Cas : téléphone non encore lié ────────────────────────────────────────

  if (!profil?.telephone) {
    return (
      <>
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide">🎯 Carte fidélité</h2>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3 text-center">
            <p className="text-4xl">🎫</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Active ta carte fidélité universelle et accumule des tampons chez tous
              les commerçants BONMOMENT sur un seul numéro.
            </p>
            <button
              onClick={() => setModalActiver(true)}
              className="w-full py-4 rounded-2xl bg-orange-500 text-white font-bold text-sm"
            >
              🎯 Activer ma carte fidélité universelle
            </button>
          </div>
        </section>

        {modalActiver && (
          <ActiverCarteModal
            onClose={() => setModalActiver(false)}
            onSuccess={handleSuccesActivation}
          />
        )}
      </>
    )
  }

  // ── Cas : téléphone lié ───────────────────────────────────────────────────

  return (
    <>
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide">🎯 Carte fidélité</h2>
          <button
            onClick={() => setModalModifier(true)}
            className="text-xs font-semibold text-orange-500 border border-orange-200 px-3 py-1.5 rounded-full hover:bg-orange-50 transition-colors"
          >
            ✏️ Modifier
          </button>
        </div>

        {/* Numéro masqué */}
        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-3">
          <span className="text-xl">📱</span>
          <div>
            <p className="text-xs text-gray-400">Numéro lié</p>
            <p className="text-sm font-bold text-gray-800 font-mono">
              {masquerTelephone(profil.telephone)}
            </p>
          </div>
        </div>

        {/* Liste des cartes */}
        {loadingCartes ? (
          <div className="flex items-center justify-center py-8">
            <span className="w-6 h-6 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : erreur ? (
          <p className="text-sm text-red-500 py-4">{erreur}</p>
        ) : cartes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6 leading-relaxed">
            Commence à utiliser ta carte chez un commerçant BONMOMENT et tu verras ta progression ici !
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {cartes.map(carte => (
              <div
                key={carte.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-2"
              >
                <div className="flex items-center gap-3">
                  {carte.commerces?.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={carte.commerces.photo_url}
                      alt={carte.commerces.nom}
                      className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">🏪</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">
                      {carte.commerces?.nom ?? '—'}
                    </p>
                    {carte.commerces?.ville && (
                      <p className="text-xs text-gray-400">{carte.commerces.ville}</p>
                    )}
                  </div>
                  <BadgeRecompenseAttente
                    recompenseEnAttente={carte.recompense_en_attente}
                    descriptionRecompense={carte.description_recompense_carte}
                  />
                </div>

                <JaugeRecompense
                  nbPassages={carte.nb_passages_depuis_derniere_recompense ?? 0}
                  seuil={carte.seuil_passages_carte ?? 10}
                  description={carte.description_recompense_carte ?? ''}
                  animated={false}
                />

                <button
                  onClick={() => setCarteHistorique({
                    carte_id:                               carte.id,
                    prenom_affiche:                         profil.nom ?? 'Moi',
                    nb_passages_depuis_derniere_recompense: carte.nb_passages_depuis_derniere_recompense,
                    seuil_passages:                         carte.seuil_passages_carte,
                    description_recompense:                 carte.description_recompense_carte,
                  })}
                  className="w-full py-2 rounded-xl bg-gray-100 text-gray-600 font-semibold text-xs hover:bg-gray-200 transition-colors"
                >
                  📖 Voir historique
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Lien désactivation */}
        <button
          onClick={() => setModalDesactiver(true)}
          className="self-center text-xs text-gray-400 hover:text-red-500 transition-colors mt-2 underline underline-offset-2"
        >
          🗑️ Désactiver ma carte fidélité
        </button>
      </section>

      {/* Modales */}
      {modalModifier && (
        <ModifierTelephoneModal
          telephoneActuel={profil.telephone}
          onClose={() => setModalModifier(false)}
          onSuccess={handleSuccesModification}
        />
      )}

      {modalDesactiver && (
        <DesactiverFideliteModal
          nbCartes={cartes.length}
          onClose={() => setModalDesactiver(false)}
          onConfirm={handleSuccesDesactivation}
        />
      )}

      {carteHistorique && (
        <HistoriquePassagesModal
          carteId={carteHistorique.carte_id}
          client={carteHistorique}
          onClose={() => setCarteHistorique(null)}
        />
      )}
    </>
  )
}
