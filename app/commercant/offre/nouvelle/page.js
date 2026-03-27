'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/app/context/AuthContext'
import OffreCard from '@/app/ville/[slug]/OffreCard'
import TutorialOffre from '@/app/components/tutorial/TutorialOffre'
import suggestionsData from '@/data/suggestions-offres.json'

const TUT_KEY = 'bonmoment_tutoriel'
function readTutState() {
  try { return JSON.parse(localStorage.getItem(TUT_KEY) || 'null') } catch { return null }
}
function writeTutState(state) {
  if (state) localStorage.setItem(TUT_KEY, JSON.stringify(state))
  else localStorage.removeItem(TUT_KEY)
}

/* ── Constantes ─────────────────────────────────────────────────────────── */

const TYPES = [
  { id: 'pourcentage',    label: 'Remise %', icon: '%'  },
  { id: 'montant_fixe',   label: 'Remise €', icon: '€'  },
  { id: 'cadeau',         label: 'Offert',   icon: '🎁' },
  { id: 'service_offert', label: 'Service',  icon: '✂️' },
  { id: 'concours',       label: 'Concours', icon: '🎰' },
  { id: 'atelier',        label: 'Atelier',  icon: '🎨' },
]

const PLACEHOLDERS = {
  pourcentage:    "Ex : Sur toutes les coupes aujourd'hui",
  montant_fixe:   'Ex : Sur ton repas du soir',
  cadeau:         "Ex : Un croissant à l'achat d'une baguette",
  service_offert: 'Ex : Diagnostic capillaire gratuit',
  concours:       "Ex : Gagnez un soin complet d'une valeur de 50€",
  atelier:        'Ex : Initiation à la pâtisserie — places limitées',
}

const JOURS = [
  { id: 'lundi',    label: 'L' },
  { id: 'mardi',    label: 'M' },
  { id: 'mercredi', label: 'M' },
  { id: 'jeudi',    label: 'J' },
  { id: 'vendredi', label: 'V' },
  { id: 'samedi',   label: 'S' },
  { id: 'dimanche', label: 'D' },
]

const QUOTA_PAR_PALIER = { decouverte: 4, essentiel: 8, pro: 16 }

/* ── Helpers ────────────────────────────────────────────────────────────── */

function toDateStr(d) {
  return d.toISOString().split('T')[0]
}

function nextQuarterHour() {
  const now  = new Date()
  const m    = now.getMinutes()
  const next = Math.ceil((m + 1) / 15) * 15
  const h    = now.getHours() + (next >= 60 ? 1 : 0)
  const min  = next >= 60 ? 0 : next
  return `${String(h % 24).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function addMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number)
  const total  = h * 60 + m + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function buildISO(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00`).toISOString()
}

function diffHours(dateStr, heureDebut, heureFin) {
  const start = new Date(`${dateStr}T${heureDebut}:00`)
  const end   = new Date(`${dateStr}T${heureFin}:00`)
  return (end - start) / 3_600_000
}

/* ── Composant ──────────────────────────────────────────────────────────── */

function NouvelleOffrePageInner() {
  const { user, loading, supabase } = useAuth()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const isTutoriel   = searchParams.get('tutoriel') === 'true'

  /* ── État auth / commerce ── */
  const [commerce,      setCommerce]      = useState(null)
  const [fetching,      setFetching]      = useState(true)
  const [quotaAtteint,  setQuotaAtteint]  = useState(false)
  const [quotaInfo,     setQuotaInfo]     = useState({ used: 0, limite: 4, palier: 'decouverte' })

  /* ── Modal première offre ── */
  const [showFirstModal,  setShowFirstModal]  = useState(false)
  const [forceTutoriel,   setForceTutoriel]   = useState(false)

  const tutActive = isTutoriel || forceTutoriel

  /* ── État tutoriel substep ── */
  const [tutSubstep, setTutSubstep] = useState(null)

  /* ── État formulaire ── */
  const today        = toDateStr(new Date())
  const defaultDebut = nextQuarterHour()
  const defaultFin   = addMinutes(defaultDebut, 180)  // +3h

  const [typeRemise,      setTypeRemise]      = useState('pourcentage')
  const [valeur,          setValeur]          = useState('')
  const [titre,           setTitre]           = useState('')
  const [nbBons,          setNbBons]          = useState(15)
  const [illimite,        setIllimite]        = useState(false)
  const [dateOffre,       setDateOffre]       = useState(today)
  const [heureDebut,      setHeureDebut]      = useState(defaultDebut)
  const [heureFin,        setHeureFin]        = useState(defaultFin)
  const [estRecurrente,   setEstRecurrente]   = useState(false)
  const [joursRecurrence, setJoursRecurrence] = useState([])

  /* ── État soumission ── */
  const [submitting, setSubmitting] = useState(false)
  const [errors,     setErrors]     = useState({})
  const [success,    setSuccess]    = useState(false)

  /* ── Auth guard ── */
  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [user, loading, router])

  /* ── Chargement commerce + quota + première offre ── */
  useEffect(() => {
    if (!user) return
    ;(async () => {
      const commerceId = searchParams.get('commerce')
      const { data: list } = await supabase
        .from('commerces')
        .select('id, nom, categorie, ville, adresse, palier')
        .eq('owner_id', user.id)

      const all  = list || []
      const data = (commerceId ? all.find(c => c.id === commerceId) : null) || all[0] || null

      if (!data) { router.replace('/'); return }
      setCommerce(data)

      const palier    = data.palier || 'decouverte'
      const limite    = QUOTA_PAR_PALIER[palier] ?? 4
      const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      const [{ count: used }, { count: total }] = await Promise.all([
        supabase.from('offres').select('id', { count: 'exact', head: true })
          .eq('commerce_id', data.id).gte('created_at', debutMois),
        supabase.from('offres').select('id', { count: 'exact', head: true })
          .eq('commerce_id', data.id),
      ])

      setQuotaInfo({ used: used ?? 0, limite, palier })
      if ((used ?? 0) >= limite) setQuotaAtteint(true)

      // Modal tutoriel si aucune offre publiée jusqu'ici
      if ((total ?? 0) === 0 && !isTutoriel) setShowFirstModal(true)

      setFetching(false)
    })()
  }, [user, supabase, router]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Init tutorial substep depuis URL ── */
  useEffect(() => {
    if (!isTutoriel) return
    const saved = readTutState()
    if (saved?.active && saved.step === 4) {
      setTutSubstep(saved.substep ?? 0)
    } else {
      writeTutState({ active: true, step: 4, substep: 0 })
      setTutSubstep(0)
    }
  }, [isTutoriel])

  /* ── Init tutorial substep depuis modal ── */
  useEffect(() => {
    if (!forceTutoriel) return
    writeTutState({ active: true, step: 4, substep: 0 })
    setTutSubstep(0)
  }, [forceTutoriel])

  /* ── Tutorial advance handler ── */
  function handleTutAdvance() {
    if (typeof tutSubstep === 'number' && tutSubstep < 4) {
      const next = tutSubstep + 1
      writeTutState({ active: true, step: 4, substep: next })
      setTutSubstep(next)
    } else if (tutSubstep === 4) {
      writeTutState({ active: true, step: 5, substep: null })
      setTutSubstep('apercu')
    } else if (tutSubstep === 'apercu') {
      writeTutState({ active: true, step: 6, substep: null })
      setTutSubstep('publier')
    } else if (tutSubstep === 'publier') {
      setTutSubstep('waiting_publish')
    }
  }

  async function handleTutSkip() {
    writeTutState(null)
    setTutSubstep(null)
    setForceTutoriel(false)
    if (commerce) {
      await supabase.from('commerces').update({ tutoriel_complete: true }).eq('id', commerce.id)
    }
  }

  async function handleTutFinish() {
    writeTutState(null)
    if (commerce) {
      await supabase.from('commerces').update({ tutoriel_complete: true }).eq('id', commerce.id)
    }
    router.replace('/commercant/dashboard')
  }

  /* ── Suggestions pour la catégorie ── */
  const suggestions = (() => {
    if (!commerce?.categorie) return suggestionsData['default'] || []
    return suggestionsData[commerce.categorie] || suggestionsData['default'] || []
  })()

  /* ── Validation plage horaire (temps réel) ── */
  const diff = diffHours(dateOffre, heureDebut, heureFin)
  const erreurHoraire = diff <= 0 ? "L'heure de fin doit être après l'heure de début." : null

  /* ── Durée formatée ── */
  const dureeLabel = diff > 0
    ? diff < 1
      ? `${Math.round(diff * 60)} min`
      : `${diff % 1 === 0 ? diff : diff.toFixed(1)}h`
    : null

  /* ── Toggle jour ── */
  function toggleJour(id) {
    setJoursRecurrence(prev =>
      prev.includes(id) ? prev.filter(j => j !== id) : [...prev, id]
    )
  }

  /* ── Preview temps réel ── */
  const previewOffre = {
    type_remise:      typeRemise,
    valeur:           valeur ? Number(valeur) : null,
    titre:            titre.trim() || 'Décris ton offre...',
    nb_bons_restants: illimite ? 9999 : (nbBons || 0),
    nb_bons_total:    illimite ? null : nbBons,
    date_debut:       buildISO(dateOffre, heureDebut),
    date_fin:         buildISO(dateOffre, heureFin),
    commerces: {
      nom:       commerce?.nom       || 'Mon commerce',
      categorie: commerce?.categorie || null,
      ville:     commerce?.ville     || null,
    },
  }

  /* ── Validation ── */
  function validate() {
    const errs = {}
    if (!titre.trim()) errs.titre = "Décris ton offre."
    if (typeRemise === 'pourcentage' || typeRemise === 'montant_fixe') {
      if (!valeur) {
        errs.valeur = 'Indique une valeur.'
      } else if (typeRemise === 'pourcentage' && (Number(valeur) < 1 || Number(valeur) > 100)) {
        errs.valeur = 'La remise doit être entre 1 et 100%.'
      } else if (typeRemise === 'montant_fixe' && Number(valeur) < 1) {
        errs.valeur = 'Le montant doit être au moins 1€.'
      }
    }
    if (!illimite && (!nbBons || nbBons < 1)) errs.nbBons = 'Indique un nombre de bons valide.'
    if (erreurHoraire) errs.horaire = erreurHoraire
    if (estRecurrente && joursRecurrence.length === 0) errs.jours = 'Sélectionne au moins un jour.'
    return errs
  }

  /* ── Soumission ── */
  async function handleSubmit(ev) {
    ev.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    const nbTotal = illimite ? null : nbBons

    try {
      const res = await fetch('/api/offres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commerce_id:       commerce.id,
          type_remise:       typeRemise,
          valeur:            (typeRemise === 'pourcentage' || typeRemise === 'montant_fixe') ? Number(valeur) : null,
          titre:             titre.trim(),
          nb_bons_total:     nbTotal,
          nb_bons_restants:  illimite ? 9999 : nbBons,
          date_debut:        buildISO(dateOffre, heureDebut),
          date_fin:          buildISO(dateOffre, heureFin),
          est_recurrente:    estRecurrente,
          jours_recurrence:  estRecurrente ? joursRecurrence : null,
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        setErrors({ submit: result.error || 'Erreur serveur' })
        setSubmitting(false)
        return
      }
    } catch {
      setErrors({ submit: 'Erreur réseau, réessaie.' })
      setSubmitting(false)
      return
    }

    setSuccess(true)
    if (!tutActive) {
      setTimeout(() => router.replace('/commercant/dashboard'), 2200)
    }
  }

  /* ── Loading ── */
  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <span className="w-8 h-8 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || !commerce) return null

  /* ── Succès (mode normal) ── */
  if (success && !tutActive) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center px-6 gap-4">
        <div className="text-6xl">🎉</div>
        <h1 className="text-2xl font-black text-[#0A0A0A]">Ton offre est en ligne !</h1>
        <p className="text-sm text-[#3D3D3D]/60">Redirection vers Mon commerce...</p>
        <span className="w-5 h-5 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin mt-2" />
      </div>
    )
  }

  const inputBase = 'border-2 border-[#E0E0E0] rounded-xl px-3 py-2.5 text-sm font-semibold text-[#0A0A0A] focus:border-[#FF6B00] focus:outline-none transition-colors min-h-[44px] w-full'

  return (
    <main className="min-h-screen bg-[#F5F5F5] flex flex-col">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-[#EBEBEB] px-5 py-3 flex items-center gap-3 sticky top-0 z-20">
        <Link
          href="/commercant/dashboard"
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#F5F5F5] text-[#3D3D3D]/60 hover:text-[#FF6B00] transition-colors text-lg"
          aria-label="Retour"
        >
          ←
        </Link>
        <Image
          src="/LOGO.png"
          alt="BONMOMENT"
          width={600}
          height={300}
          unoptimized
          priority
          className="w-[90px] h-auto"
        />
        <div className="ml-auto flex items-center gap-2 text-[11px]">
          <span className={`font-bold px-2.5 py-1 rounded-full ${
            quotaAtteint ? 'bg-red-100 text-red-600' : 'bg-[#FFF0E0] text-[#FF6B00]'
          }`}>
            {quotaInfo.used}/{quotaInfo.limite} offres
          </span>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 w-full max-w-lg mx-auto px-4 py-5 flex flex-col gap-5">

        {/* ── Alerte quota ── */}
        {quotaAtteint && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
            <p className="text-sm font-bold text-amber-800 mb-1">
              Tu as utilisé toutes tes offres du mois.
            </p>
            <p className="text-xs text-amber-700">
              Palier actuel : <strong>{quotaInfo.palier}</strong> ({quotaInfo.limite} offres/mois).{' '}
              <Link href="/commercant/abonnement" className="underline font-semibold hover:text-[#FF6B00]">
                Gérer mon abonnement →
              </Link>
            </p>
          </div>
        )}

        {/* ══ 1. TYPE D'OFFRE ════════════════════════════════════════════ */}
        <section className="bg-white rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#3D3D3D]/50 mb-3">
            Type d'offre
          </p>
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypeRemise(t.id)}
                className={`flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-xl border-2 transition-all min-h-[68px] ${
                  typeRemise === t.id
                    ? 'bg-[#FF6B00] border-[#FF6B00] text-white shadow-md shadow-orange-200'
                    : 'bg-white border-[#E0E0E0] text-[#3D3D3D] hover:border-[#FF6B00] hover:text-[#FF6B00]'
                }`}
              >
                <span className="text-xl leading-none">{t.icon}</span>
                <span className="text-[9px] font-bold leading-tight text-center">{t.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ══ 2. VALEUR (conditionnel) ════════════════════════════════════ */}
        {(typeRemise === 'pourcentage' || typeRemise === 'montant_fixe') && (
          <section className="bg-white rounded-2xl px-5 py-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#3D3D3D]/50 mb-3">
              {typeRemise === 'pourcentage' ? 'Remise en %' : 'Montant de la remise'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl font-black text-[#FF6B00] select-none">−</span>
              <input
                type="number"
                inputMode="numeric"
                value={valeur}
                onChange={e => setValeur(e.target.value)}
                min={1}
                max={typeRemise === 'pourcentage' ? 100 : undefined}
                placeholder={typeRemise === 'pourcentage' ? '20' : '5'}
                className="w-full max-w-[200px] text-4xl font-black text-[#0A0A0A] text-center border-2 border-[#E0E0E0] rounded-2xl py-3 focus:border-[#FF6B00] focus:outline-none transition-colors min-h-[64px]"
              />
              <span className="text-4xl font-black text-[#FF6B00] w-10 text-center select-none">
                {typeRemise === 'pourcentage' ? '%' : '€'}
              </span>
            </div>
            {errors.valeur && (
              <p className="text-xs text-red-500 mt-2 font-semibold text-center">⚠ {errors.valeur}</p>
            )}
          </section>
        )}

        {/* ══ 3. DESCRIPTION ═════════════════════════════════════════════ */}
        <section className="bg-white rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#3D3D3D]/50 mb-3">
            Description de l'offre
          </p>
          <div className="relative">
            <textarea
              value={titre}
              onChange={e => setTitre(e.target.value.slice(0, 150))}
              placeholder={PLACEHOLDERS[typeRemise]}
              rows={2}
              className="w-full border-2 border-[#E0E0E0] rounded-2xl px-4 py-3 text-sm font-semibold text-[#0A0A0A] placeholder:text-[#3D3D3D]/30 placeholder:font-normal focus:border-[#FF6B00] focus:outline-none transition-colors resize-none pr-16"
            />
            <span className={`absolute bottom-3 right-4 text-[10px] font-bold tabular-nums ${
              titre.length >= 140 ? 'text-amber-500' : 'text-[#3D3D3D]/30'
            }`}>
              {titre.length}/150
            </span>
          </div>
          {errors.titre && (
            <p className="text-xs text-red-500 mt-1 font-semibold">⚠ {errors.titre}</p>
          )}
        </section>

        {/* ══ 4. NOMBRE DE BONS ══════════════════════════════════════════ */}
        <section className="bg-white rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#3D3D3D]/50 mb-3">
            Nombre de bons
          </p>
          <div className="flex items-center gap-3">
            {/* Stepper − / valeur / + */}
            <div className={`flex items-center gap-3 ${illimite ? 'opacity-40 pointer-events-none' : ''}`}>
              <button
                type="button"
                onClick={() => setNbBons(v => Math.max(1, v - 1))}
                disabled={illimite}
                className="w-11 h-11 flex items-center justify-center bg-[#FF6B00] hover:bg-[#CC5500] text-white font-black text-xl rounded-lg transition-colors shrink-0"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                value={nbBons}
                onChange={e => setNbBons(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={illimite}
                className="w-16 text-2xl font-black text-[#0A0A0A] text-center border-2 border-[#E0E0E0] rounded-xl py-2 focus:border-[#FF6B00] focus:outline-none transition-colors min-h-[44px]"
              />
              <button
                type="button"
                onClick={() => setNbBons(v => v + 1)}
                disabled={illimite}
                className="w-11 h-11 flex items-center justify-center bg-[#FF6B00] hover:bg-[#CC5500] text-white font-black text-xl rounded-lg transition-colors shrink-0"
              >
                +
              </button>
            </div>

            {/* Toggle illimité */}
            <button
              type="button"
              onClick={() => setIllimite(v => !v)}
              className={`ml-auto px-4 h-11 rounded-xl border-2 font-bold text-sm transition-all whitespace-nowrap ${
                illimite
                  ? 'bg-[#FF6B00] border-[#FF6B00] text-white shadow-md shadow-orange-200'
                  : 'border-[#E0E0E0] text-[#3D3D3D] hover:border-[#FF6B00] hover:text-[#FF6B00]'
              }`}
            >
              ♾️ Illimité
            </button>
          </div>
          {errors.nbBons && (
            <p className="text-xs text-red-500 mt-2 font-semibold">⚠ {errors.nbBons}</p>
          )}
        </section>

        {/* ══ 5. PLAGE HORAIRE ═══════════════════════════════════════════ */}
        <section className="bg-white rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#3D3D3D]/50 mb-3">
            Plage horaire
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#3D3D3D]/50 uppercase tracking-widest">
                📅 Date
              </label>
              <input
                type="date"
                value={dateOffre}
                min={today}
                onChange={e => setDateOffre(e.target.value)}
                className={inputBase}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#3D3D3D]/50 uppercase tracking-widest">
                ⏰ De
              </label>
              <input
                type="time"
                value={heureDebut}
                step="900"
                onChange={e => setHeureDebut(e.target.value)}
                className={inputBase}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#3D3D3D]/50 uppercase tracking-widest">
                ⏰ À
              </label>
              <input
                type="time"
                value={heureFin}
                step="900"
                onChange={e => setHeureFin(e.target.value)}
                className={inputBase}
              />
            </div>
          </div>

          {dureeLabel && !erreurHoraire && (
            <p className="text-[11px] text-[#3D3D3D]/50 mt-2 font-medium">
              ⏱ Durée : {dureeLabel}
            </p>
          )}
          {(erreurHoraire || errors.horaire) && (
            <p className="text-xs text-red-500 mt-2 font-semibold">
              ⚠ {erreurHoraire || errors.horaire}
            </p>
          )}
        </section>

        {/* ══ 6. RÉCURRENCE ══════════════════════════════════════════════ */}
        <section className="bg-white rounded-2xl px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#0A0A0A]">Répéter cette offre</p>
              <p className="text-[11px] text-[#3D3D3D]/50">Recréée automatiquement chaque semaine</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={estRecurrente}
              onClick={() => setEstRecurrente(v => !v)}
              className={`relative shrink-0 w-12 h-6 rounded-full transition-colors duration-200 ${
                estRecurrente ? 'bg-[#FF6B00]' : 'bg-[#E0E0E0]'
              }`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                estRecurrente ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {estRecurrente && (
            <div className="mt-4 flex gap-2">
              {JOURS.map(j => (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => toggleJour(j.id)}
                  title={j.id}
                  className={`flex-1 h-10 rounded-xl border-2 font-black text-xs transition-all ${
                    joursRecurrence.includes(j.id)
                      ? 'bg-[#FF6B00] border-[#FF6B00] text-white'
                      : 'border-[#E0E0E0] text-[#3D3D3D] hover:border-[#FF6B00] hover:text-[#FF6B00]'
                  }`}
                >
                  {j.label}
                </button>
              ))}
            </div>
          )}
          {errors.jours && (
            <p className="text-xs text-red-500 mt-2 font-semibold">⚠ {errors.jours}</p>
          )}
        </section>

        {/* ══ 7. APERÇU TEMPS RÉEL ═══════════════════════════════════════ */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#3D3D3D]/50 mb-3 px-1">
            Aperçu client en temps réel
          </p>
          <div className="max-w-[280px] mx-auto">
            <OffreCard offre={previewOffre} />
          </div>
        </section>

        {/* ── Erreur submit ── */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
            <p className="text-sm text-red-600 font-semibold">⚠ {errors.submit}</p>
          </div>
        )}

        {/* ══ 8. BOUTON PUBLICATION ══════════════════════════════════════ */}
        <button
          type="submit"
          disabled={submitting || quotaAtteint || !!erreurHoraire}
          className="w-full bg-[#FF6B00] hover:bg-[#CC5500] disabled:bg-[#D0D0D0] disabled:cursor-not-allowed text-white font-black text-base py-4 rounded-2xl transition-colors duration-200 shadow-lg shadow-orange-200/60 min-h-[56px] flex items-center justify-center gap-2"
        >
          {submitting ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Publier mon offre 🚀'
          )}
        </button>

        <div className="h-6" />
      </form>

      {/* ── Modal première offre ─────────────────────────────────────────── */}
      {showFirstModal && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl px-6 py-8 flex flex-col gap-5">
            <div className="text-center">
              <p className="text-4xl mb-3">🎉</p>
              <h2 className="text-xl font-black text-[#0A0A0A] leading-tight">
                C'est ta première offre !
              </h2>
              <p className="text-sm text-[#3D3D3D]/60 mt-2">
                Souhaites-tu être accompagné étape par étape ?
              </p>
            </div>
            <button
              onClick={() => { setShowFirstModal(false); setForceTutoriel(true) }}
              className="w-full bg-[#FF6B00] hover:bg-[#CC5500] text-white font-black text-base py-4 rounded-2xl transition-colors shadow-lg shadow-orange-200/60"
            >
              Oui, guide-moi !
            </button>
            <button
              onClick={() => setShowFirstModal(false)}
              className="w-full text-[#3D3D3D]/60 font-semibold text-sm py-2 hover:text-[#0A0A0A] transition-colors"
            >
              Non merci, je remplis seul
            </button>
          </div>
        </div>
      )}

      {/* ── Tutorial overlay ─────────────────────────────────────────────── */}
      {tutActive && (
        <TutorialOffre
          substep={tutSubstep}
          onAdvance={handleTutAdvance}
          onSkip={handleTutSkip}
          onApplySugg={(text) => setTitre(text)}
          suggestions={suggestions}
          success={success && tutActive}
          onFinish={handleTutFinish}
        />
      )}

    </main>
  )
}

export default function NouvelleOffrePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <span className="w-8 h-8 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <NouvelleOffrePageInner />
    </Suspense>
  )
}
