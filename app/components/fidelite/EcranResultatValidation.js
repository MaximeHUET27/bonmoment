'use client'

import { useState } from 'react'
import { useFidelite } from '@/app/hooks/fidelite/useFidelite'
import JaugeRecompense from './JaugeRecompense'

// Confettis CSS — legers=true pour scénarios 1 & 2, false pour scénario 3
function Confettis({ legers = false }) {
  const count = legers ? 10 : 18
  const duree = legers ? '0.9s' : '1.4s'
  const pieces = Array.from({ length: count }, (_, i) => ({
    id: i,
    color: ['#FF6B00', '#FFD700', '#FF4FD8', '#4FD8FF', '#7CFF4F'][i % 5],
    left:  `${5 + i * (legers ? 9 : 5)}%`,
    delay: `${(i * 0.10).toFixed(2)}s`,
    size:  legers ? 6 + (i % 3) * 3 : 8 + (i % 3) * 4,
  }))

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-40px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(240px) rotate(720deg); opacity: 0; }
        }
      `}</style>
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {pieces.map(p => (
          <div
            key={p.id}
            style={{
              position:        'absolute',
              left:            p.left,
              top:             0,
              width:           p.size,
              height:          p.size,
              borderRadius:    p.id % 2 === 0 ? '50%' : '2px',
              backgroundColor: p.color,
              animation:       `confetti-fall ${duree} ease-in ${p.delay} forwards`,
            }}
          />
        ))}
      </div>
    </>
  )
}

export default function EcranResultatValidation({ resultat, nbTampons = 1, onClose, onConfirmerRecompense, onAnnuler }) {
  const { annulerPassage, confirmerRecompenseRemise } = useFidelite()
  const [busy, setBusy] = useState(false)

  const nbPassages  = resultat?.nb_passages_depuis_recompense ?? 0
  const seuil       = resultat?.seuil_passages ?? 10
  const description = resultat?.description_recompense ?? 'Récompense'
  const prenom      = resultat?.client_prenom
  const bonValide   = resultat?.bon_valide === true
  const debloquee   = resultat?.recompense_debloquee === true

  async function handleConfirmerRecompense() {
    if (busy) return
    setBusy(true)
    try {
      if (resultat?.carte_id) await confirmerRecompenseRemise(resultat.carte_id)
      onConfirmerRecompense?.()
      onClose()
    } catch { /* onClose quand même */ onClose() }
    finally { setBusy(false) }
  }

  async function handleAnnuler() {
    if (busy) return
    setBusy(true)
    try {
      if (resultat?.passage_id) await annulerPassage(resultat.passage_id)
      onAnnuler?.()
      onClose()
    } catch { onClose() }
    finally { setBusy(false) }
  }

  // ── Scénario 3 : récompense débloquée ────────────────────────────────────
  if (debloquee) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60">
        <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
          <Confettis />
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-4 sm:hidden" />
          <div className="relative px-6 pt-4 pb-8 flex flex-col gap-4 items-center text-center">
            <p className="text-6xl mt-2">🎉</p>
            <h2 className="text-2xl font-black text-gray-900 leading-tight">
              RÉCOMPENSE DÉBLOQUÉE
            </h2>
            {prenom && <p className="text-lg font-bold text-orange-500">{prenom}</p>}
            <p className="text-base text-gray-700 font-semibold leading-snug">{description}</p>

            <JaugeRecompense nbPassages={nbPassages} seuil={seuil} description={description} animated />

            <div className="flex flex-col gap-3 w-full mt-2">
              <button
                onClick={handleConfirmerRecompense}
                disabled={busy}
                className="w-full py-4 rounded-2xl bg-orange-500 text-white font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : '✓ Récompense remise'}
              </button>
              <button
                onClick={onClose}
                disabled={busy}
                className="w-full py-3 rounded-2xl bg-gray-100 text-gray-600 font-bold text-sm disabled:opacity-40"
              >
                Plus tard
              </button>
              <button
                onClick={handleAnnuler}
                disabled={busy}
                className="w-full py-3 rounded-2xl border border-gray-200 text-gray-400 font-medium text-sm disabled:opacity-40"
              >
                ✗ Annuler ce passage
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Scénario 2 : bon validé (+ tampon) ───────────────────────────────────
  // ── Scénario 1 : tampon simple ────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60">
      <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        <Confettis legers />
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-4 sm:hidden" />
        <div className="relative px-6 pt-4 pb-8 flex flex-col gap-4">
          {/* En-tête */}
          <div className="text-center">
            <p className="text-4xl font-black text-orange-500">⭐ TAMPON +{nbTampons}</p>
            {prenom && (
              <p className="text-lg font-bold text-gray-700 mt-1">{prenom}</p>
            )}
          </div>

          {/* Bon validé si applicable */}
          {bonValide && (
            <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-center">
              <p className="text-sm font-bold text-green-700">
                🎟️ BON VALIDÉ
              </p>
              {resultat?.bon_code_validation && (
                <p className="text-xs text-green-600 mt-0.5 font-mono">
                  {resultat.bon_code_validation}
                </p>
              )}
            </div>
          )}

          {/* Jauge animée */}
          <JaugeRecompense
            nbPassages={nbPassages}
            seuil={seuil}
            description={description}
            animated
          />

          {/* Boutons */}
          <div className="flex gap-3 mt-2">
            <button
              onClick={handleAnnuler}
              disabled={busy}
              className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-500 font-bold text-sm disabled:opacity-50"
            >
              ✗ Annuler
            </button>
            <button
              onClick={onClose}
              disabled={busy}
              className="flex-[2] py-4 rounded-2xl bg-orange-500 text-white font-bold text-sm disabled:opacity-50"
            >
              ✓ Confirmer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
