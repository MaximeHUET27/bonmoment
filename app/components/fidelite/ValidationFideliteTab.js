'use client'

import { useState } from 'react'
import { normaliserTelephone } from '@/app/lib/fidelite/helpers'
import { useFidelite } from '@/app/hooks/fidelite/useFidelite'
import SaisieTelephoneCaisse from './SaisieTelephoneCaisse'
import ConsentementRGPD from './ConsentementRGPD'
import ConfirmationTamponModal from './ConfirmationTamponModal'
import EcranResultatValidation from './EcranResultatValidation'
import JaugeRecompense from './JaugeRecompense'

const ETAPES = /** @type {const} */ (['saisie', 'consentement', 'confirmation_tampon', 'resultat'])

export default function ValidationFideliteTab({
  commerceId,
  onSuccess,
  onError,
  programme = null,
}) {
  const { enregistrerPassage } = useFidelite()

  const [etape, setEtape]               = useState('saisie')
  const [telephone, setTelephone]       = useState('')
  const [consentement, setConsentement] = useState(false)
  const [erreurSaisie, setErreurSaisie] = useState(null)
  const [loading, setLoading]           = useState(false)
  const [consultResult, setConsultResult] = useState(null)
  const [resultat, setResultat]           = useState(null)

  const telNorm = normaliserTelephone(telephone)

  // ── Mode consultation (juste vérifier) ────────────────────────────────────
  async function handleConsultation() {
    if (!telNorm) { setErreurSaisie('Numéro invalide'); return }
    setErreurSaisie(null)
    setLoading(true)
    try {
      const res = await enregistrerPassage({
        commerceId,
        mode: 'telephone',
        identifierValue: telNorm,
        modeConsultation: true,
      })
      setConsultResult(res)
      setEtape('resultat_consultation')
    } catch (e) {
      onError?.(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Flow normal : vérif téléphone → consentement ou modal ─────────────────
  async function handleValider() {
    if (!telNorm) { setErreurSaisie('Numéro invalide'); return }
    setErreurSaisie(null)
    setLoading(true)

    // Vérification préalable : le client existe-t-il ?
    try {
      const res = await enregistrerPassage({
        commerceId,
        mode: 'telephone',
        identifierValue: telNorm,
        modeConsultation: true,
      })
      setConsultResult(res)
      // Client inconnu (success=false, message='Client inconnu') → consentement requis
      if (!res?.success || res?.message === 'Client inconnu') {
        setEtape('consentement')
      } else {
        setEtape('confirmation_tampon')
      }
    } catch {
      // En cas d'erreur (client inconnu renvoyé en 400) → consentement
      setConsultResult(null)
      setEtape('consentement')
    } finally {
      setLoading(false)
    }
  }

  // ── Callback confirmation tampons (depuis ConfirmationTamponModal) ────────
  async function handleConfirm({ commerceId: cId, mode, identifierValue, prenomOptionnel, nbTampons }) {
    const res = await enregistrerPassage({
      commerceId: cId,
      mode,
      identifierValue,
      prenomOptionnel: prenomOptionnel || undefined,
      modeConsultation: false,
      nbTampons,
    })
    setResultat(res)
    setEtape('resultat')
    onSuccess?.(res)
  }

  function reset() {
    setEtape('saisie')
    setTelephone('')
    setConsentement(false)
    setConsultResult(null)
    setResultat(null)
    setErreurSaisie(null)
  }

  // ── Écran résultat consultation simple ────────────────────────────────────
  if (etape === 'resultat_consultation') {
    const r = consultResult
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="bg-gray-50 rounded-2xl p-5 flex flex-col gap-3">
          <p className="text-xl font-black text-gray-900 text-center">
            {r?.client_prenom ? `👤 ${r.client_prenom}` : '👤 Client'}
          </p>
          {r?.seuil_passages ? (
            <JaugeRecompense
              nbPassages={r.nb_passages_depuis_recompense ?? 0}
              seuil={r.seuil_passages}
              description={r.description_recompense ?? ''}
            />
          ) : (
            <p className="text-sm text-gray-500 text-center">Nouveau client</p>
          )}
          {r?.recompense_en_attente && (
            <p className="text-sm font-bold text-orange-600 text-center">
              ⚠️ Récompense en attente de remise
            </p>
          )}
        </div>
        <button
          onClick={reset}
          className="w-full py-4 rounded-2xl bg-gray-100 text-gray-700 font-bold text-sm"
        >
          Fermer
        </button>
      </div>
    )
  }

  // ── Étape consentement ────────────────────────────────────────────────────
  if (etape === 'consentement') {
    return (
      <div className="flex flex-col gap-5 p-4">
        <div className="bg-orange-50 rounded-2xl p-4">
          <p className="text-sm font-semibold text-orange-700 text-center">
            Nouveau client — numéro non reconnu
          </p>
          <p className="text-xs text-orange-600 text-center mt-1">{telNorm}</p>
        </div>
        <ConsentementRGPD checked={consentement} onChange={setConsentement} />
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold text-sm"
          >
            ✗ Retour
          </button>
          <button
            onClick={() => { if (consentement) setEtape('confirmation_tampon') }}
            disabled={!consentement}
            className="flex-[2] py-4 rounded-2xl bg-orange-500 text-white font-bold text-sm disabled:opacity-40"
          >
            ✓ Continuer
          </button>
        </div>
      </div>
    )
  }

  // ── Modal confirmation tampons ─────────────────────────────────────────────
  if (etape === 'confirmation_tampon') {
    return (
      <ConfirmationTamponModal
        commerceId={commerceId}
        mode="telephone"
        identifierValue={telNorm}
        prenomOptionnel={consultResult?.client_prenom ?? null}
        seuilFallback={programme?.seuil_passages ?? 10}
        descriptionFallback={programme?.description_recompense ?? 'Récompense'}
        regleTampons={programme?.regle_tampons ?? null}
        onConfirm={handleConfirm}
        onCancel={reset}
      />
    )
  }

  // ── Écran résultat final ───────────────────────────────────────────────────
  if (etape === 'resultat') {
    return (
      <EcranResultatValidation
        resultat={resultat}
        onClose={reset}
        onConfirmerRecompense={() => {}}
        onAnnuler={reset}
      />
    )
  }

  // ── Étape saisie (défaut) ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 text-center">
        Numéro du client
      </p>
      <SaisieTelephoneCaisse
        value={telephone}
        onChange={setTelephone}
        onValid={() => setErreurSaisie(null)}
      />
      {erreurSaisie && (
        <p className="text-sm text-red-500 text-center font-medium">{erreurSaisie}</p>
      )}
      <div className="flex gap-3">
        <button
          onClick={handleConsultation}
          disabled={!telNorm || loading}
          className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm disabled:opacity-40"
        >
          {loading ? '…' : '👁️ Juste vérifier'}
        </button>
        <button
          onClick={handleValider}
          disabled={!telNorm || loading}
          className="flex-[2] py-4 rounded-2xl bg-orange-500 text-white font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : '✓ Valider ce client'}
        </button>
      </div>
    </div>
  )
}
