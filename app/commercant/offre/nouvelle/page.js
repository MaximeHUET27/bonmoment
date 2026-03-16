'use client'

/**
 * SQL à exécuter dans Supabase si ces colonnes n'existent pas encore :
 *
 *   ALTER TABLE offres ADD COLUMN IF NOT EXISTS date_debut TIMESTAMPTZ;
 *   ALTER TABLE offres ADD COLUMN IF NOT EXISTS est_recurrente BOOLEAN DEFAULT false;
 *   ALTER TABLE offres ADD COLUMN IF NOT EXISTS jours_recurrence TEXT[];
 *   ALTER TABLE commerces ADD COLUMN IF NOT EXISTS palier TEXT DEFAULT 'decouverte';
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/app/context/AuthContext'
import OffreCard from '@/app/ville/[slug]/OffreCard'

/* ── Constantes ─────────────────────────────────────────────────────────── */

const TYPES = [
  { id: 'pourcentage',    label: 'Remise %',    icon: '%'  },
  { id: 'montant_fixe',   label: 'Remise €',    icon: '€'  },
  { id: 'cadeau',         label: 'Cadeau',      icon: '🎁' },
  { id: 'produit_offert', label: 'Produit',     icon: '📦' },
  { id: 'service_offert', label: 'Service',     icon: '✂️' },
  { id: 'concours',       label: 'Concours',    icon: '🎰' },
  { id: 'atelier',        label: 'Atelier',     icon: '🎨' },
]

const PLACEHOLDERS = {
  pourcentage:    "Ex : Sur toutes les coupes aujourd'hui",
  montant_fixe:   'Ex : Sur votre repas du soir',
  cadeau:         "Ex : Un croissant à l'achat d'une baguette",
  produit_offert: 'Ex : Une boisson offerte pour tout menu',
  service_offert: 'Ex : Diagnostic capillaire gratuit',
  concours:       "Ex : Gagnez un soin complet d'une valeur de 50€",
  atelier:        'Ex : Initiation à la pâtisserie — places limitées',
}

const BONS_RAPIDES = [5, 10, 15, 20, 50]

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
  const now = new Date()
  const m   = now.getMinutes()
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

function diffHours(dateDebut, heureDebut, dateFin, heureFin) {
  const start = new Date(`${dateDebut}T${heureDebut}:00`)
  const end   = new Date(`${dateFin}T${heureFin}:00`)
  return (end - start) / 3_600_000
}

/* ── Composant ──────────────────────────────────────────────────────────── */

export default function NouvelleOffrePage() {
  const { user, loading, supabase } = useAuth()
  const router = useRouter()

  /* ── État auth / commerce ── */
  const [commerce,      setCommerce]      = useState(null)
  const [fetching,      setFetching]      = useState(true)
  const [quotaAtteint,  setQuotaAtteint]  = useState(false)
  const [quotaInfo,     setQuotaInfo]     = useState({ used: 0, limite: 4, palier: 'decouverte' })

  /* ── État formulaire ── */
  const today           = toDateStr(new Date())
  const defaultDebut    = nextQuarterHour()
  const defaultFin      = addMinutes(defaultDebut, 180)   // +3h

  const [typeRemise,      setTypeRemise]      = useState('pourcentage')
  const [valeur,          setValeur]          = useState('')
  const [titre,           setTitre]           = useState('')
  const [nbBons,          setNbBons]          = useState(15)
  const [illimite,        setIllimite]        = useState(false)
  const [dateDebut,       setDateDebut]       = useState(today)
  const [heureDebut,      setHeureDebut]      = useState(defaultDebut)
  const [dateFin,         setDateFin]         = useState(today)
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

  /* ── Chargement commerce + quota ── */
  useEffect(() => {
    if (!user) return
    ;(async () => {
      const { data } = await supabase
        .from('commerces')
        .select('id, nom, categorie, ville, adresse, palier')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (!data) { router.replace('/'); return }
      setCommerce(data)

      const palier = data.palier || 'decouverte'
      const limite = QUOTA_PAR_PALIER[palier] ?? 4
      const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      const { count } = await supabase
        .from('offres')
        .select('id', { count: 'exact', head: true })
        .eq('commerce_id', data.id)
        .gte('created_at', debutMois)

      const used = count ?? 0
      setQuotaInfo({ used, limite, palier })
      if (used >= limite) setQuotaAtteint(true)
      setFetching(false)
    })()
  }, [user, supabase, router])

  /* ── Validation plage horaire (en temps réel) ── */
  const diff = diffHours(dateDebut, heureDebut, dateFin, heureFin)
  const erreurHoraire =
    diff <= 0 ? "L'heure de fin doit être après l'heure de début." :
    diff > 24  ? 'Une offre ne peut pas dépasser 24h.'              :
    null

  /* ── Toggle jour de récurrence ── */
  function toggleJour(id) {
    setJoursRecurrence(prev =>
      prev.includes(id) ? prev.filter(j => j !== id) : [...prev, id]
    )
  }

  /* ── Objet preview en temps réel ── */
  const previewOffre = {
    type_remise:     typeRemise,
    valeur:          valeur ? Number(valeur) : null,
    titre:           titre.trim() || 'Décris ton offre...',
    nb_bons_restants: illimite ? 9999 : (nbBons || 0),
    nb_bons_total:   illimite ? null : nbBons,
    date_fin:        buildISO(dateFin, heureFin),
    commerces: {
      nom:      commerce?.nom      || 'Mon commerce',
      categorie: commerce?.categorie || null,
      ville:    commerce?.ville    || null,
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

    const { error } = await supabase.from('offres').insert({
      commerce_id:       commerce.id,
      type_remise:       typeRemise,
      valeur:            (typeRemise === 'pourcentage' || typeRemise === 'montant_fixe') ? Number(valeur) : null,
      titre:             titre.trim(),
      nb_bons_total:     nbTotal,
      nb_bons_restants:  illimite ? 9999 : nbBons,
      date_debut:        buildISO(dateDebut, heureDebut),
      date_fin:          buildISO(dateFin, heureFin),
      statut:            'active',
      est_recurrente:    estRecurrente,
      jours_recurrence:  estRecurrente ? joursRecurrence : null,
    })

    if (error) {
      setErrors({ submit: error.message })
      setSubmitting(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.replace('/commercant/dashboard'), 2200)
  }

  /* ── États de chargement / garde ── */
  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <span className="w-8 h-8 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || !commerce) return null

  /* ── Écran de succès ── */
  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center px-6 gap-4">
        <div className="text-6xl">🎉</div>
        <h1 className="text-2xl font-black text-[#0A0A0A]">Ton offre est en ligne !</h1>
        <p className="text-sm text-[#3D3D3D]/60">Redirection vers Mon commerce...</p>
        <span className="w-5 h-5 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin mt-2" />
      </div>
    )
  }

  /* ── Rendu principal ── */
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
            quotaAtteint
              ? 'bg-red-100 text-red-600'
              : 'bg-[#FFF0E0] text-[#FF6B00]'
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
              Palier actuel : <strong>{quotaInfo.palier}</strong> ({quotaInfo.limite} offres/mois).
              Passe au palier supérieur pour en publier plus !{' '}
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
          <div className="grid grid-cols-4 gap-2">
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
            <div className="flex items-center gap-3">
              <input
                type="number"
                inputMode="numeric"
                value={valeur}
                onChange={e => setValeur(e.target.value)}
                min={1}
                max={typeRemise === 'pourcentage' ? 100 : undefined}
                placeholder={typeRemise === 'pourcentage' ? '20' : '5'}
                className="flex-1 text-4xl font-black text-[#0A0A0A] text-center border-2 border-[#E0E0E0] rounded-2xl py-3 focus:border-[#FF6B00] focus:outline-none transition-colors min-h-[64px]"
              />
              <span className="text-4xl font-black text-[#FF6B00] w-10 text-center">
                {typeRemise === 'pourcentage' ? '%' : '€'}
              </span>
            </div>
            {errors.valeur && (
              <p className="text-xs text-red-500 mt-2 font-semibold">⚠ {errors.valeur}</p>
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
          <div className="flex items-center gap-2 flex-wrap">
            {BONS_RAPIDES.map(n => (
              <button
                key={n}
                type="button"
                onClick={() => { setNbBons(n); setIllimite(false) }}
                className={`w-11 h-11 rounded-xl border-2 font-black text-sm transition-all ${
                  !illimite && nbBons === n
                    ? 'bg-[#FF6B00] border-[#FF6B00] text-white shadow-md shadow-orange-200'
                    : 'border-[#E0E0E0] text-[#3D3D3D] hover:border-[#FF6B00] hover:text-[#FF6B00]'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIllimite(v => !v)}
              className={`px-4 h-11 rounded-xl border-2 font-black text-xs transition-all ${
                illimite
                  ? 'bg-[#FF6B00] border-[#FF6B00] text-white shadow-md shadow-orange-200'
                  : 'border-[#E0E0E0] text-[#3D3D3D] hover:border-[#FF6B00] hover:text-[#FF6B00]'
              }`}
            >
              Illimité
            </button>
            <span className="ml-auto text-3xl font-black text-[#FF6B00] min-w-[2.5rem] text-right tabular-nums">
              {illimite ? '∞' : nbBons}
            </span>
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
          <div className="flex flex-col gap-3">

            {/* Début */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#3D3D3D]/50 w-9 shrink-0">Début</span>
              <input
                type="date"
                value={dateDebut}
                min={today}
                onChange={e => setDateDebut(e.target.value)}
                className="flex-1 border-2 border-[#E0E0E0] rounded-xl px-3 py-2.5 text-sm font-semibold text-[#0A0A0A] focus:border-[#FF6B00] focus:outline-none transition-colors min-h-[44px]"
              />
              <input
                type="time"
                value={heureDebut}
                step="900"
                onChange={e => setHeureDebut(e.target.value)}
                className="w-[7.5rem] border-2 border-[#E0E0E0] rounded-xl px-3 py-2.5 text-sm font-semibold text-[#0A0A0A] focus:border-[#FF6B00] focus:outline-none transition-colors min-h-[44px]"
              />
            </div>

            {/* Fin */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#3D3D3D]/50 w-9 shrink-0">Fin</span>
              <input
                type="date"
                value={dateFin}
                min={dateDebut}
                onChange={e => setDateFin(e.target.value)}
                className="flex-1 border-2 border-[#E0E0E0] rounded-xl px-3 py-2.5 text-sm font-semibold text-[#0A0A0A] focus:border-[#FF6B00] focus:outline-none transition-colors min-h-[44px]"
              />
              <input
                type="time"
                value={heureFin}
                step="900"
                onChange={e => setHeureFin(e.target.value)}
                className="w-[7.5rem] border-2 border-[#E0E0E0] rounded-xl px-3 py-2.5 text-sm font-semibold text-[#0A0A0A] focus:border-[#FF6B00] focus:outline-none transition-colors min-h-[44px]"
              />
            </div>

          </div>

          {/* Durée indicative */}
          {!erreurHoraire && diff > 0 && (
            <p className="text-[11px] text-[#3D3D3D]/50 mt-2 font-medium">
              ⏱ Durée : {diff < 1
                ? `${Math.round(diff * 60)} min`
                : `${diff % 1 === 0 ? diff : diff.toFixed(1)}h`}
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
              {JOURS.map((j, i) => (
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
    </main>
  )
}
