'use client'

import { useState, useEffect } from 'react'
import { useFidelite } from '@/app/hooks/fidelite/useFidelite'
import JaugeRecompense from './JaugeRecompense'
import ConfirmationTamponModal from './ConfirmationTamponModal'
import EcranResultatValidation from './EcranResultatValidation'
import ValidationFideliteTab from './ValidationFideliteTab'

export default function EcranProposerFidelite({ commerceId, client, programme, onClose }) {
  const { enregistrerPassage } = useFidelite()

  const [consultation,       setConsultation]       = useState(null)
  const [loadingConsult,     setLoadingConsult]     = useState(!!client?.telephone)
  const [etape,              setEtape]              = useState(null)  // null | 'confirmation' | 'validation_tab' | 'resultat'
  const [resultatTampon,     setResultatTampon]     = useState(null)
  const [nbTamponsConfirmes, setNbTamponsConfirmes] = useState(1)

  const telephone = client?.telephone ?? null
  const prenom    = client?.prenom   ?? null

  // Charge la jauge actuelle si le client a un téléphone lié
  useEffect(() => {
    if (!telephone) return
    let cancelled = false
    async function consulter() {
      try {
        const res = await enregistrerPassage({
          commerceId,
          mode: 'telephone',
          identifierValue: telephone,
          modeConsultation: true,
        })
        if (!cancelled) setConsultation(res)
      } catch {
        // non-bloquant — on affiche le composant sans jauge
      } finally {
        if (!cancelled) setLoadingConsult(false)
      }
    }
    consulter()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleConfirmTampon({ commerceId: cId, mode, identifierValue, prenomOptionnel, nbTampons }) {
    const res = await enregistrerPassage({
      commerceId: cId,
      mode,
      identifierValue,
      prenomOptionnel: prenomOptionnel || undefined,
      modeConsultation: false,
      nbTampons,
    })
    setNbTamponsConfirmes(nbTampons)
    setResultatTampon(res)
    setEtape('resultat')
  }

  // EcranResultatValidation prend tout l'écran (z-50) — on le sort en premier
  if (etape === 'resultat') {
    return (
      <EcranResultatValidation
        resultat={resultatTampon}
        nbTampons={nbTamponsConfirmes}
        onClose={onClose}
        onConfirmerRecompense={() => {}}
        onAnnuler={onClose}
      />
    )
  }

  return (
    <>
      {/* ── Écran principal persistant ───────────────────────────────────────── */}
      <div className="fixed inset-0 z-50 bg-white flex flex-col">

        {/* En-tête */}
        <div className="px-6 pt-10 pb-4 flex flex-col items-center gap-2 text-center">
          <p className="text-5xl">🎯</p>
          <h2 className="text-xl font-black text-gray-900 mt-1">Ajouter un tampon fidélité ?</h2>
          {prenom && (
            <p className="text-base font-semibold text-orange-500">{prenom}</p>
          )}
        </div>

        {/* Corps — jauge ou invitation */}
        <div className="flex-1 px-6 flex flex-col justify-center gap-4">
          {telephone ? (
            loadingConsult ? (
              <div className="flex justify-center py-8">
                <span className="w-7 h-7 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : consultation ? (
              <div className="bg-gray-50 rounded-2xl p-5 flex flex-col gap-2">
                <JaugeRecompense
                  nbPassages={consultation.nb_passages_depuis_recompense ?? 0}
                  seuil={consultation.seuil_passages ?? programme?.seuil_passages ?? 10}
                  description={consultation.description_recompense ?? programme?.description_recompense ?? 'Récompense'}
                  animated={false}
                />
                {consultation.recompense_en_attente && (
                  <p className="text-xs font-bold text-orange-600 text-center mt-1">
                    ⚠️ Récompense en attente de remise
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center">Carte fidélité active</p>
            )
          ) : (
            <div className="bg-orange-50 rounded-2xl p-5 text-center flex flex-col gap-1">
              <p className="text-sm font-semibold text-orange-700 leading-relaxed">
                Ce client n'a pas encore activé sa carte fidélité.
              </p>
              <p className="text-xs text-orange-500">
                Proposez-lui d'y adhérer maintenant.
              </p>
            </div>
          )}
        </div>

        {/* Footer — 2 boutons */}
        <div className="px-6 pb-10 pt-4 flex flex-col gap-3">
          <button
            onClick={() => setEtape(telephone ? 'confirmation' : 'validation_tab')}
            disabled={etape !== null}
            className="w-full py-4 rounded-2xl bg-orange-500 text-white font-bold text-base disabled:opacity-50"
          >
            🎯 {telephone ? 'Ajouter un tampon' : 'Proposer la carte fidélité'}
          </button>
          <button
            onClick={onClose}
            disabled={etape !== null}
            className="w-full py-3 rounded-2xl bg-gray-100 text-gray-600 font-bold text-sm disabled:opacity-40"
          >
            Passer au suivant →
          </button>
        </div>
      </div>

      {/* ── Overlay : ConfirmationTamponModal (client avec téléphone) ── */}
      {etape === 'confirmation' && (
        <ConfirmationTamponModal
          commerceId={commerceId}
          mode="telephone"
          identifierValue={telephone}
          prenomOptionnel={prenom}
          seuilFallback={programme?.seuil_passages ?? 10}
          descriptionFallback={programme?.description_recompense ?? 'Récompense'}
          regleTampons={programme?.regle_tampons ?? null}
          onConfirm={handleConfirmTampon}
          onCancel={() => setEtape(null)}
        />
      )}

      {/* ── Overlay : ValidationFideliteTab (client sans téléphone) ── */}
      {etape === 'validation_tab' && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <button
              onClick={() => setEtape(null)}
              className="text-gray-500 font-semibold text-sm min-h-[44px] flex items-center"
            >
              ← Retour
            </button>
            <p className="text-sm font-bold text-gray-900">🎯 Proposer la carte fidélité</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ValidationFideliteTab
              commerceId={commerceId}
              programme={programme}
            />
          </div>
        </div>
      )}
    </>
  )
}
