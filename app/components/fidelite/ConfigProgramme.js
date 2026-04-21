'use client'

import { useEffect, useState } from 'react'
import { useFidelite } from '@/app/hooks/fidelite/useFidelite'
import { useToast } from '@/app/components/Toast'

export default function ConfigProgramme({ commerceId, onSaved }) {
  const { getProgramme, mettreAJourProgramme } = useFidelite()
  const { showToast } = useToast()

  const [chargement,   setChargement]   = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [confirmModal, setConfirmModal] = useState(false)

  // Valeurs sauvegardées (référence pour détecter les changements)
  const [sauvegarde, setSauvegarde] = useState(null)

  // Valeurs du formulaire
  const [actif,                setActif]                = useState(false)
  const [seuilPassages,        setSeuilPassages]        = useState(10)
  const [descriptionRecompense, setDescriptionRecompense] = useState('')
  const [regleTampons,         setRegleTampons]         = useState('')

  useEffect(() => {
    let cancelled = false
    async function charger() {
      try {
        const prog = await getProgramme(commerceId)
        if (!cancelled) {
          const val = {
            actif:                prog?.actif                ?? false,
            seuilPassages:        prog?.seuil_passages       ?? 10,
            descriptionRecompense: prog?.description_recompense ?? '',
            regleTampons:         prog?.regle_tampons        ?? '',
          }
          setSauvegarde(val)
          setActif(val.actif)
          setSeuilPassages(val.seuilPassages)
          setDescriptionRecompense(val.descriptionRecompense)
          setRegleTampons(val.regleTampons)
        }
      } catch {
        if (!cancelled) showToast('Impossible de charger le programme', 'erreur')
      } finally {
        if (!cancelled) setChargement(false)
      }
    }
    charger()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commerceId])

  const aChange = sauvegarde !== null && (
    actif                 !== sauvegarde.actif                ||
    seuilPassages         !== sauvegarde.seuilPassages         ||
    descriptionRecompense !== sauvegarde.descriptionRecompense ||
    regleTampons          !== sauvegarde.regleTampons
  )

  const formValide = !actif || (descriptionRecompense.trim().length > 0 && seuilPassages >= 1 && seuilPassages <= 1000)

  // Détecte si l'utilisateur baisse le seuil par rapport à la valeur sauvegardée
  const baisseSeuil = sauvegarde !== null
    && actif
    && seuilPassages < sauvegarde.seuilPassages
    && sauvegarde.seuilPassages > 0

  async function enregistrer() {
    setIsProcessing(true)
    setConfirmModal(false)
    try {
      const res = await mettreAJourProgramme({
        commerceId,
        seuilPassages,
        descriptionRecompense: descriptionRecompense.trim(),
        regleTampons: regleTampons.trim() || null,
        actif,
      })
      const nouv = { actif, seuilPassages, descriptionRecompense: descriptionRecompense.trim(), regleTampons: regleTampons.trim() }
      setSauvegarde(nouv)

      const msg = res?.recompenses_debloquees > 0
        ? `✅ Programme enregistré · ${res.recompenses_debloquees} récompense(s) débloquée(s) immédiatement`
        : '✅ Programme enregistré'
      showToast(msg, 'success')
      onSaved?.()
    } catch (e) {
      showToast(`😔 Erreur : ${e.message}`, 'erreur')
    } finally {
      setIsProcessing(false)
    }
  }

  function handleEnregistrer() {
    if (baisseSeuil) {
      setConfirmModal(true)
    } else {
      enregistrer()
    }
  }

  if (chargement) {
    return (
      <div className="flex items-center justify-center py-10">
        <span className="w-6 h-6 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        <h3 className="text-base font-black text-gray-900">⚙️ Configuration du programme fidélité</h3>

        {/* Toggle actif */}
        <label className="flex items-center justify-between gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer select-none">
          <div>
            <p className="font-bold text-gray-800 text-sm">Programme actif</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {actif ? 'Les clients accumulent des tampons.' : 'Désactivé — aucun tampon accordé.'}
            </p>
          </div>
          <div
            onClick={() => setActif(v => !v)}
            className={[
              'relative w-12 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0',
              actif ? 'bg-orange-500' : 'bg-gray-200',
            ].join(' ')}
          >
            <span className={[
              'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
              actif ? 'translate-x-6' : 'translate-x-0.5',
            ].join(' ')} />
          </div>
        </label>

        {/* Champs visibles si actif */}
        {actif && (
          <div className="flex flex-col gap-4">
            {/* Seuil */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                Seuil de passages pour déclencher la récompense
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={seuilPassages}
                  onChange={e => setSeuilPassages(Math.min(1000, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-24 text-center text-xl font-black border-2 border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-400"
                />
                <span className="text-sm text-gray-500">passages (entre 1 et 1000)</span>
              </div>
              {baisseSeuil && (
                <p className="text-xs text-orange-600 font-medium mt-0.5">
                  ⚠️ Inférieur au seuil actuel ({sauvegarde.seuilPassages}) — une confirmation sera demandée.
                </p>
              )}
            </div>

            {/* Description récompense */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                Description de la récompense
              </label>
              <input
                type="text"
                maxLength={100}
                value={descriptionRecompense}
                onChange={e => setDescriptionRecompense(e.target.value)}
                placeholder="1 café offert"
                className="border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400"
              />
              <p className="text-xs text-gray-400 text-right">{descriptionRecompense.length}/100</p>
            </div>

            {/* Règle tampons */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                Règle de tampons <span className="font-normal normal-case">(optionnel)</span>
              </label>
              <textarea
                maxLength={200}
                rows={2}
                value={regleTampons}
                onChange={e => setRegleTampons(e.target.value)}
                placeholder="1 tampon par tranche de 50€ d'achat"
                className="border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 resize-none"
              />
              <p className="text-xs text-gray-400 text-right">{regleTampons.length}/200</p>
            </div>
          </div>
        )}

        {/* Bouton enregistrer */}
        <button
          onClick={handleEnregistrer}
          disabled={!aChange || !formValide || isProcessing}
          className="w-full py-4 rounded-2xl bg-orange-500 text-white font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
        >
          {isProcessing
            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enregistrement…</>
            : '💾 Enregistrer'}
        </button>
      </div>

      {/* Modal confirmation baisse seuil */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full flex flex-col gap-4">
            <p className="text-base font-black text-gray-900">⚠️ Confirmer la baisse du seuil</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Baisser le seuil de <strong>{sauvegarde?.seuilPassages}</strong> à <strong>{seuilPassages}</strong> passages
              va débloquer immédiatement une récompense pour tous les clients qui dépassent le nouveau seuil.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(false)}
                disabled={isProcessing}
                className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold text-sm"
              >
                Annuler
              </button>
              <button
                onClick={enregistrer}
                disabled={isProcessing}
                className="flex-[2] py-3 rounded-2xl bg-orange-500 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : '✓ Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
