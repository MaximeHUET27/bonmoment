'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/app/context/AuthContext'
import OffreCard from '@/app/ville/[slug]/OffreCard'
import TutorialOffre from '@/app/components/tutorial/TutorialOffre'
import suggestionsData from '@/data/suggestions-offres.json'
import { triggerConfetti } from '@/lib/confetti'
import { getFullOffreTitle } from '@/lib/offreTitle'

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
  { id: 'cadeau',       label: 'Cadeau offert', icon: '🎁' },
  { id: 'atelier',      label: 'Évènement',     icon: '🎉' },
  { id: 'concours',     label: 'Concours',      icon: '🎰' },
  { id: 'pourcentage',  label: 'Remise %',      icon: '%'  },
  { id: 'montant_fixe', label: 'Remise €',      icon: '€'  },
  { id: 'fidelite',     label: 'Fidélité',      icon: '⭐' },
]

const PLACEHOLDERS = {
  pourcentage:    "Ex : Sur toutes les coupes aujourd'hui",
  montant_fixe:   'Ex : Sur ton repas du soir',
  cadeau:         'Ex : un café pour la commande d\'un menu plat/dessert',
  concours:       "Ex : Gagnez un soin complet d'une valeur de 50€",
  atelier:        'Ex : initiation à la pâtisserie — 50€ / 1h',
  fidelite:       'Ex : vos points doublés',
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

const QUOTA_PAR_PALIER = { essentiel: 8, pro: null }

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
  const [quotaInfo,     setQuotaInfo]     = useState({ used: 0, limite: 8, palier: 'essentiel' })

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

  const [typeRemise,      setTypeRemise]      = useState(() => searchParams.get('prefill_type') || 'cadeau')
  const [valeur,          setValeur]          = useState(() => searchParams.get('prefill_valeur') || '')
  const [titre,           setTitre]           = useState(() => searchParams.get('prefill_titre') || '')
  const [nbBons,          setNbBons]          = useState(() => {
    const n = searchParams.get('prefill_nb_bons')
    return n ? Math.max(1, parseInt(n) || 15) : 15
  })
  const [illimite,        setIllimite]        = useState(() => searchParams.get('prefill_illimite') === 'true')
  const [dateOffre,       setDateOffre]       = useState(today)
  const [heureDebut,      setHeureDebut]      = useState(defaultDebut)
  const [heureFin,        setHeureFin]        = useState(defaultFin)
  const [estRecurrente,   setEstRecurrente]   = useState(() => searchParams.get('prefill_recurrente') === 'true')
  const [joursRecurrence, setJoursRecurrence] = useState(() => {
    const j = searchParams.get('prefill_jours')
    return j ? j.split(',').filter(Boolean) : []
  })

  /* ── État soumission ── */
  const [submitting,      setSubmitting]      = useState(false)
  const [errors,          setErrors]          = useState({})
  const [success,         setSuccess]         = useState(false)
  const [createdOffreId,  setCreatedOffreId]  = useState(null)
  const [shareMenuOpen,   setShareMenuOpen]   = useState(false)
  const [shareCopied,     setShareCopied]     = useState(false)

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
        .select('id, nom, categorie, ville, adresse, palier, note_google, photo_url, tutoriel_complete')
        .eq('owner_id', user.id)

      const all  = list || []
      const data = (commerceId ? all.find(c => c.id === commerceId) : null) || all[0] || null

      if (!data) { router.replace('/'); return }

      // Sécurité : pas d'abonnement Stripe actif → retour page abonnement
      if (!data.palier) { router.replace(`/commercant/abonnement?commerce_id=${data.id}`); return }

      setCommerce(data)

      const palier    = data.palier || 'essentiel'
      const limite    = QUOTA_PAR_PALIER[palier] ?? 8
      const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      const [{ count: used }, { count: total }] = await Promise.all([
        supabase.from('offres').select('id', { count: 'exact', head: true })
          .eq('commerce_id', data.id).gte('created_at', debutMois),
        supabase.from('offres').select('id', { count: 'exact', head: true })
          .eq('commerce_id', data.id),
      ])

      setQuotaInfo({ used: used ?? 0, limite, palier })
      if (limite !== null && (used ?? 0) >= limite) setQuotaAtteint(true)

      // Modal tutoriel si aucune offre publiée jusqu'ici et tutoriel pas encore complété
      if ((total ?? 0) === 0 && !isTutoriel && !data.tutoriel_complete) { setShowFirstModal(true) }

      setFetching(false)
    })()
  }, [user, supabase, router]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Init tutorial substep depuis URL ── */
  useEffect(() => {
    if (!isTutoriel) return
    const saved = readTutState()
    if (saved?.active && saved.step === 4) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  /* ── Validation dates passées (temps réel) ── */
  const erreurDateDebut = new Date(`${dateOffre}T${heureDebut}:00`) < new Date()
    ? "L'heure de début ne peut pas être dans le passé"
    : null
  const erreurDateFin = new Date(`${dateOffre}T${heureFin}:00`) <= new Date()
    ? "L'heure de fin ne peut pas être dans le passé"
    : null

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
      nom:         commerce?.nom         || 'Mon commerce',
      categorie:   commerce?.categorie   || null,
      ville:       commerce?.ville       || null,
      note_google: commerce?.note_google || null,
      photo_url:   commerce?.photo_url   || null,
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
    const now = new Date()
    if (new Date(`${dateOffre}T${heureDebut}:00`) < now) errs.dateDebut = "L'heure de début ne peut pas être dans le passé"
    if (new Date(`${dateOffre}T${heureFin}:00`) <= now)  errs.dateFin   = "L'heure de fin ne peut pas être dans le passé"
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
      setCreatedOffreId(result.id || result.offre?.id || null)
    } catch {
      setErrors({ submit: 'Erreur réseau, réessaie.' })
      setSubmitting(false)
      return
    }

    setSuccess(true)
    triggerConfetti()
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
    const shareUrl = createdOffreId ? `https://bonmoment.app/offre/${createdOffreId}` : 'https://bonmoment.app'
    const shareTitle = `${commerce?.nom || 'Bonmoment'} — ${getFullOffreTitle({ type_remise: typeRemise, valeur: Number(valeur) || null, titre: titre.trim() }) || 'Nouvelle offre'}`
    const shareText  = `Profite de mon offre sur Bonmoment 🎁`

    async function handleShare() {
      if (navigator.share) {
        try {
          await navigator.share({ title: shareTitle, text: shareText, url: shareUrl })
        } catch {
          // user dismissed — no action needed
        }
      } else {
        setShareMenuOpen(m => !m)
      }
    }

    async function handleCopyLink() {
      try { await navigator.clipboard.writeText(shareUrl) } catch { }
      setShareCopied(true)
      setTimeout(() => { setShareCopied(false); setShareMenuOpen(false) }, 2000)
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center px-6 gap-6 relative">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-black text-[#0A0A0A]">Ton offre est en ligne !</h1>
          <p className="text-sm text-[#3D3D3D]/60 max-w-xs">
            Partage-la autour de toi pour attirer tes premiers clients dès aujourd&apos;hui.
          </p>
        </div>

        <div className="relative flex flex-col items-center gap-3 w-full max-w-xs">
          <button
            onClick={handleShare}
            className="w-full py-4 rounded-2xl bg-[#FF6B00] text-white font-black text-base shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-3"
          >
            {/* Logos réseaux chevauchés */}
            <div className="flex items-center shrink-0" style={{ marginRight: '-4px' }}>
              {/* WhatsApp */}
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm" style={{ zIndex: 3 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              {/* Facebook */}
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm -ml-1.5" style={{ zIndex: 2 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              {/* Instagram */}
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm -ml-1.5" style={{ zIndex: 1 }}>
                <svg width="14" height="14" viewBox="0 0 24 24">
                  <defs>
                    <linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%"   stopColor="#FDB347"/>
                      <stop offset="30%"  stopColor="#F7627B"/>
                      <stop offset="65%"  stopColor="#C01F8A"/>
                      <stop offset="100%" stopColor="#7232BD"/>
                    </linearGradient>
                  </defs>
                  <path fill="url(#igGrad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
            </div>
            Partager mon offre
          </button>

          {shareMenuOpen && (
            <div className="absolute top-full mt-2 w-full bg-white border border-[#F0F0F0] rounded-2xl shadow-xl overflow-hidden z-10">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`}
                target="_blank" rel="noopener noreferrer"
                onClick={() => setShareMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-[#0A0A0A] hover:bg-[#F5F5F5]"
              >
                <span className="text-lg">💬</span> WhatsApp
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                target="_blank" rel="noopener noreferrer"
                onClick={() => setShareMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-[#0A0A0A] hover:bg-[#F5F5F5] border-t border-[#F0F0F0]"
              >
                <span className="text-lg">📘</span> Facebook
              </a>
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-[#0A0A0A] hover:bg-[#F5F5F5] border-t border-[#F0F0F0]"
              >
                <span className="text-lg">{shareCopied ? '✅' : '🔗'}</span>
                {shareCopied ? 'Lien copié !' : 'Copier le lien'}
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => router.push('/')}
          className="text-xs text-[#3D3D3D]/40 underline underline-offset-2 hover:text-[#3D3D3D]/60"
        >
          Je ne souhaite pas partager
        </button>
      </div>
    )
  }

  const inputBase = 'border-2 border-[#E0E0E0] rounded-xl px-3 py-2.5 text-sm font-semibold text-[#0A0A0A] focus:border-[#FF6B00] focus:outline-none transition-colors min-h-[44px] w-full'

  return (
    <main className="min-h-screen bg-[#F5F5F5] flex flex-col">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-[#EBEBEB] px-5 py-3 flex items-center justify-between sticky top-0 z-20">
        <Link href="/">
          <Image
            src="/LOGO.png"
            alt="BONMOMENT"
            width={600}
            height={300}
            unoptimized
            priority
            className="w-[100px] h-auto"
          />
        </Link>
        <div className="flex items-center gap-3">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
            quotaAtteint ? 'bg-red-100 text-red-600' : 'bg-[#FFF0E0] text-[#FF6B00]'
          }`}>
            {quotaInfo.limite === null ? `${quotaInfo.used} offres` : `${quotaInfo.used}/${quotaInfo.limite} offres`}
          </span>
          <Link href="/commercant/dashboard" className="bg-[#FF6B00] hover:bg-[#CC5500] text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors min-h-[44px] flex items-center whitespace-nowrap">
            Mon commerce
          </Link>
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
        <section id="tut-type" className="bg-white rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#3D3D3D]/50 mb-3">
            Type d&apos;offre
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
        <section id="tut-description" className="bg-white rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#3D3D3D]/50 mb-3">
            Description de l&apos;offre
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
        <section id="tut-nb-bons" className="bg-white rounded-2xl px-5 py-4 shadow-sm">
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
        <section id="tut-horaire" className="bg-white rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#3D3D3D]/50 mb-3">
            Plage horaire
          </p>
          {/* Mobile : DATE pleine largeur, puis DE + À côte à côte — Desktop : 3 colonnes */}
          <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[2fr_1fr_1fr] sm:gap-2">
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
            <div className="flex gap-2 w-full sm:contents">
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#3D3D3D]/50 uppercase tracking-widest">
                  ⏰ De
                </label>
                <input
                  type="time"
                  value={heureDebut}
                  step="900"
                  onChange={e => setHeureDebut(e.target.value)}
                  className={`${inputBase} min-w-0`}
                />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#3D3D3D]/50 uppercase tracking-widest">
                  ⏰ À
                </label>
                <input
                  type="time"
                  value={heureFin}
                  step="900"
                  onChange={e => setHeureFin(e.target.value)}
                  className={`${inputBase} min-w-0`}
                />
              </div>
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
          {(erreurDateDebut || errors.dateDebut) && (
            <p className="text-xs text-red-500 mt-2 font-semibold">
              ⚠ {erreurDateDebut || errors.dateDebut}
            </p>
          )}
          {(erreurDateFin || errors.dateFin) && (
            <p className="text-xs text-red-500 mt-2 font-semibold">
              ⚠ {erreurDateFin || errors.dateFin}
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
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                estRecurrente ? 'translate-x-6' : ''
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
                  className={`flex-1 min-h-[44px] rounded-xl font-black text-xs transition-all ${
                    joursRecurrence.includes(j.id)
                      ? 'bg-[#FF6B00] text-white'
                      : 'bg-[#F5F5F5] text-[#3D3D3D] hover:bg-[#FFF0E0] hover:text-[#FF6B00]'
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
        <section id="tut-apercu">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#3D3D3D]/50 mb-3 px-1">
            Aperçu client en temps réel
          </p>
          <div className="max-w-[700px] mx-auto">
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
         
          id="tut-publier"
          type="submit"
          disabled={submitting || quotaAtteint || !!erreurHoraire || !!erreurDateDebut || !!erreurDateFin}
          className="w-full bg-[#FF6B00] hover:bg-[#CC5500] disabled:bg-[#D0D0D0] disabled:cursor-not-allowed text-white font-black text-base py-4 rounded-2xl transition duration-200 ease-out hover:scale-[1.02] active:scale-[0.97] shadow-lg shadow-orange-200/60 min-h-[56px] flex items-center justify-center gap-2"
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
              <h2 className="text-xl font-black text-[#0A0A0A] leading-tight">
                C&apos;est ta première offre !
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
              onClick={async () => {
                setShowFirstModal(false)
                if (commerce?.id) {
                  await supabase.from('commerces').update({ tutoriel_complete: true }).eq('id', commerce.id)
                }
              }}
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
