'use client'

/**
 * SQL à exécuter dans Supabase si la colonne n'existe pas encore :
 *   ALTER TABLE commerces ADD COLUMN IF NOT EXISTS tutoriel_complete BOOLEAN DEFAULT false;
 */

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { QRCodeCanvas } from 'qrcode.react'
import { useAuth } from '@/app/context/AuthContext'
import { toSlug } from '@/lib/utils'
import TirageAuSort from '@/app/commercant/components/TirageAuSort'
import TutorialDashboard from '@/app/components/tutorial/TutorialDashboard'
import ShareButton from '@/app/components/ShareButton'
import AuthButton from '@/app/components/AuthButton'
import DeleteCommerceButton from '@/app/commercant/[id]/DeleteCommerceButton'

const TUT_KEY = 'bonmoment_tutoriel'

function readTutState() {
  try { return JSON.parse(localStorage.getItem(TUT_KEY) || 'null') } catch { return null }
}
function writeTutState(state) {
  if (state) localStorage.setItem(TUT_KEY, JSON.stringify(state))
  else localStorage.removeItem(TUT_KEY)
}

export default function DashboardPage() {
  const { user, loading, supabase } = useAuth()
  const router  = useRouter()
  const qrRef   = useRef(null)
  const [commerce,      setCommerce]      = useState(null)
  const [allCommerces,  setAllCommerces]  = useState([])
  const [fetching,      setFetching]      = useState(true)
  const [qrToast,       setQrToast]       = useState(null)
  const [offres,        setOffres]        = useState([])
  const [nbParticipants, setNbParticipants] = useState({}) // offre_id → count
  const [tutStep,       setTutStep]       = useState(null) // null | 1 | 2 | 3
  const [showRelance,   setShowRelance]   = useState(false)
  const tutRef1 = useRef(null)
  const tutRef2 = useRef(null)
  const tutRef3 = useRef(null)

  /* ── Auth guard ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [user, loading, router])

  /* ── Fetch commerce(s) ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (!user) return
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const commerceId = params?.get('commerce')
    supabase
      .from('commerces')
      .select('id, nom, categorie, ville, adresse, code_parrainage, code_parrainage_expire_at, note_google, tutoriel_complete')
      .eq('owner_id', user.id)
      .then(({ data }) => {
        const list = data || []
        setAllCommerces(list)
        if (commerceId) {
          setCommerce(list.find(c => c.id === commerceId) || list[0] || null)
        } else {
          setCommerce(list[0] || null)
        }
        setFetching(false)
      })
  }, [user, supabase])

  /* ── Init tutorial state from localStorage ──────────────────────────────── */
  useEffect(() => {
    const saved = readTutState()
    if (saved?.active && saved.step >= 1 && saved.step <= 3) {
      setTutStep(saved.step)
    } else if (saved?.active && saved.step > 3) {
      // tutorial moved to offre page, show relance
      setShowRelance(true)
    }
  }, [])

  /* ── Scroll to highlighted element when tutorial step changes ── */
  useEffect(() => {
    if (!tutStep) return
    const ref = tutStep === 1 ? tutRef1 : tutStep === 2 ? tutRef2 : tutRef3
    if (ref.current) {
      setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
    }
  }, [tutStep])

  /* ── Fetch offres (actives + expirées) ──────────────────────────────────── */
  useEffect(() => {
    if (!commerce) return
    supabase
      .from('offres')
      .select('id, titre, type_remise, valeur, statut, date_fin, nb_bons_restants, nb_bons_total, gagnant_id')
      .eq('commerce_id', commerce.id)
      .in('statut', ['active', 'expiree'])
      .order('date_fin', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setOffres(data || [])

        // Compter les participants validés pour chaque concours expiré
        const concours = (data || []).filter(o => o.type_remise === 'concours' && o.statut === 'expiree')
        if (!concours.length) return

        Promise.all(
          concours.map(o =>
            supabase
              .from('reservations')
              .select('id', { count: 'exact', head: true })
              .eq('offre_id', o.id)
              .eq('statut', 'utilisee')
              .then(({ count }) => [o.id, count ?? 0])
          )
        ).then(entries => {
          setNbParticipants(Object.fromEntries(entries))
        })
      })
  }, [commerce, supabase])

  /* ── Tutorial handlers ──────────────────────────────────────────────────── */
  function startTutorial() {
    writeTutState({ active: true, step: 1 })
    setTutStep(1)
  }

  function handleTutAdvance() {
    if (tutStep === 3) {
      // Navigate to offre page in tutorial mode
      writeTutState({ active: true, step: 4, substep: 0 })
      setTutStep(null)
      router.push('/commercant/offre/nouvelle?tutoriel=true')
    } else {
      const next = (tutStep || 1) + 1
      writeTutState({ active: true, step: next })
      setTutStep(next)
    }
  }

  async function handleTutSkip() {
    writeTutState(null)
    setTutStep(null)
    setShowRelance(false)
    if (commerce) {
      await supabase.from('commerces').update({ tutoriel_complete: true }).eq('id', commerce.id)
      setCommerce(c => c ? { ...c, tutoriel_complete: true } : c)
    }
  }

  if (loading || fetching) {
    return (
      <main className="min-h-screen bg-[#F5F5F5] flex flex-col">
        {/* Header */}
        <header className="w-full bg-white border-b border-[#EBEBEB] px-6 py-4 flex items-center justify-between">
          <div className="w-[120px] h-8 bg-[#E0E0E0] rounded-xl animate-pulse" />
        </header>

        <div className="flex-1 w-full max-w-xl mx-auto px-5 py-6 flex flex-col gap-5 animate-pulse">

          {/* Bouton vérifier (placeholder) */}
          <div className="w-full h-[72px] bg-[#FFD9B8] rounded-3xl" />

          {/* Bloc bienvenue */}
          <div className="bg-white rounded-3xl px-6 py-8 flex flex-col gap-3 shadow-sm">
            <div className="h-3 w-24 bg-[#E0E0E0] rounded" />
            <div className="h-8 w-48 bg-[#E0E0E0] rounded-xl" />
            <div className="h-4 w-full bg-[#E0E0E0] rounded" />
            <div className="h-4 w-3/4 bg-[#E0E0E0] rounded" />
          </div>

          {/* 3 blocs KPI en ligne */}
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl px-4 py-5 h-20 shadow-sm flex flex-col gap-2">
                <div className="h-3 w-12 bg-[#E0E0E0] rounded" />
                <div className="h-5 w-8 bg-[#E0E0E0] rounded" />
              </div>
            ))}
          </div>

          {/* Bloc offres actives */}
          <div className="bg-white rounded-3xl px-6 py-6 flex flex-col gap-4 shadow-sm">
            <div className="h-4 w-40 bg-[#E0E0E0] rounded" />
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-1">
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-4 w-3/4 bg-[#E0E0E0] rounded" />
                  <div className="h-3 w-1/2 bg-[#E0E0E0] rounded" />
                </div>
                <div className="h-5 w-10 bg-[#E0E0E0] rounded shrink-0" />
              </div>
            ))}
          </div>

          {/* Bloc offres expirées */}
          <div className="bg-white rounded-3xl px-6 py-6 flex flex-col gap-4 shadow-sm">
            <div className="h-4 w-52 bg-[#E0E0E0] rounded" />
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-1 opacity-60">
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-4 w-2/3 bg-[#E0E0E0] rounded" />
                  <div className="h-3 w-1/3 bg-[#E0E0E0] rounded" />
                </div>
                <div className="h-5 w-10 bg-[#E0E0E0] rounded shrink-0" />
              </div>
            ))}
          </div>

        </div>
      </main>
    )
  }

  if (!user) return null

  const prenom = user.user_metadata?.full_name?.split(' ')[0]
    ?? user.user_metadata?.name?.split(' ')[0]
    ?? 'commerçant'

  const offresActives  = offres.filter(o => o.statut === 'active')
  const offresExpirees = offres.filter(o => o.statut === 'expiree')

  return (
    <main className="min-h-screen bg-[#F5F5F5] flex flex-col">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="w-full bg-white border-b border-[#EBEBEB] px-6 py-4 flex items-center justify-between">
        <Link href="/" aria-label="Accueil BONMOMENT">
          <Image
            src="/LOGO.png"
            alt="BONMOMENT"
            width={600}
            height={300}
            unoptimized
            priority
            className="w-[120px] h-auto"
          />
        </Link>
        <AuthButton />
      </header>

      {/* ── Corps ────────────────────────────────────────────────────────── */}
      <div className="flex-1 w-full max-w-xl mx-auto px-5 py-6 flex flex-col gap-5">

        {/* ── Relance tutoriel ──────────────────────────────────────────── */}
        {showRelance && !tutStep && (
          <div className="bg-[#FFF0E0] border border-[#FFCFA0] rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-[#FF6B00]">Guide en cours 📚</p>
              <p className="text-xs text-[#3D3D3D]/70">Reprends là où tu t'étais arrêté.</p>
            </div>
            <button
              onClick={() => {
                const saved = readTutState()
                if (saved?.step >= 4) {
                  router.push('/commercant/offre/nouvelle?tutoriel=true')
                } else {
                  setTutStep(saved?.step || 1)
                }
              }}
              className="shrink-0 bg-[#FF6B00] text-white font-bold text-xs px-4 py-2 rounded-xl min-h-[36px]"
            >
              Reprendre →
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ✅ BOUTON VÉRIFIER UN BON — Priorité absolue, toujours visible */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {commerce && (
          <div ref={tutRef2}>
            <Link
              href="/commercant/valider"
              className={`w-full bg-[#FF6B00] hover:bg-[#CC5500] active:bg-[#CC5500] text-white font-black text-xl py-5 rounded-3xl transition-colors duration-200 shadow-xl shadow-orange-300/50 min-h-[72px] flex items-center justify-center text-center gap-3 ${
                tutStep === 2 ? 'ring-4 ring-white ring-offset-2 relative z-[41]' : ''
              }`}
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              <span className="text-2xl">✅</span>
              Vérifier un bon
            </Link>
          </div>
        )}

        {/* ── Message de bienvenue ──────────────────────────────────────── */}
        <div ref={tutRef1} className={`bg-white rounded-3xl px-6 py-8 flex flex-col gap-2 shadow-sm ${
          tutStep === 1 ? 'ring-4 ring-[#FF6B00] ring-offset-2 relative z-[41]' : ''
        }`}>
          <p className="text-xs font-semibold text-[#FF6B00] uppercase tracking-widest">Mon commerce</p>
          <h1 className="text-2xl font-black text-[#0A0A0A] leading-tight">
            Bienvenue,&nbsp;{prenom}&nbsp;!&nbsp;🎉
          </h1>
          {commerce ? (
            <p className="text-sm text-[#3D3D3D]/70 mt-1">
              Ton commerce <span className="font-bold text-[#0A0A0A]">{commerce.nom}</span> est bien enregistré.
              Tu peux dès maintenant créer ta première offre.
            </p>
          ) : (
            <p className="text-sm text-[#3D3D3D]/70 mt-1">
              Ton inscription est en cours de traitement. Recharge la page dans quelques instants.
            </p>
          )}
        </div>

        {/* ── Sélecteur de commerce (si 2+) ────────────────────────────── */}
        {allCommerces.length >= 2 && (
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {allCommerces.map(c => (
              <button
                key={c.id}
                onClick={() => setCommerce(c)}
                className={`shrink-0 text-xs font-bold px-4 py-2 rounded-full transition-colors whitespace-nowrap min-h-[36px] ${
                  commerce?.id === c.id
                    ? 'bg-[#FF6B00] text-white'
                    : 'bg-[#F5F5F5] text-[#3D3D3D] hover:bg-[#FFF0E0] hover:text-[#FF6B00]'
                }`}
              >
                🏪 {c.nom}
              </button>
            ))}
          </div>
        )}

        {/* ── Infos commerce ───────────────────────────────────────────── */}
        {commerce && (
          <div className="bg-white rounded-3xl px-6 py-6 flex flex-col gap-4 shadow-sm">
            <h2 className="text-sm font-black text-[#0A0A0A] uppercase tracking-wide">Ton établissement</h2>

            <div className="flex flex-col gap-2">
              {commerce.categorie && (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold text-[#FF6B00] uppercase tracking-widest bg-[#FFF0E0] px-2 py-0.5 rounded-full">
                    {commerce.categorie}
                  </span>
                </div>
              )}
              <p className="text-base font-bold text-[#0A0A0A]">{commerce.nom}</p>
              {commerce.adresse && (
                <p className="text-xs text-[#3D3D3D]/60">📍 {commerce.adresse}</p>
              )}
              {commerce.ville && (
                <p className="text-xs text-[#3D3D3D]/60">{commerce.ville}</p>
              )}
              {commerce.note_google && (
                <p className="text-xs text-[#3D3D3D]/60">⭐ {commerce.note_google} / 5 sur Google</p>
              )}
            </div>

            {/* Code parrainage */}
            {commerce.code_parrainage && (
              <div className="bg-[#F5F5F5] rounded-2xl px-4 py-4 flex flex-col gap-1 mt-2">
                <p className="text-[10px] font-semibold text-[#3D3D3D]/60 uppercase tracking-widest">
                  Ton code parrainage
                </p>
                <p className="text-xl font-black text-[#FF6B00] tracking-wider">{commerce.code_parrainage}</p>
                {commerce.code_parrainage_expire_at && (
                  <p className="text-[10px] text-[#3D3D3D]/50">
                    Valable jusqu&apos;au{' '}
                    {new Date(commerce.code_parrainage_expire_at).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                )}
                <p className="text-[10px] text-[#3D3D3D]/40 mt-1">
                  Partage ce code à d&apos;autres commerçants pour bénéficier d&apos;avantages.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── CTA créer une offre ───────────────────────────────────────── */}
        {commerce && (
          <div ref={tutRef3}>
            <Link
              href="/commercant/offre/nouvelle"
              className={`w-full bg-[#0A0A0A] hover:bg-[#1A1A1A] text-white font-black text-base py-4 rounded-2xl transition-colors duration-200 min-h-[56px] flex items-center justify-center text-center ${
                tutStep === 3 ? 'ring-4 ring-[#FF6B00] ring-offset-2 relative z-[41]' : ''
              }`}
            >
              ✨ Créer une offre
            </Link>
          </div>
        )}

        {/* ── CTA démarrer le guide (premier lancement) ─────────────────── */}
        {commerce && !commerce.tutoriel_complete && !tutStep && !showRelance && offresActives.length === 0 && (
          <button
            onClick={startTutorial}
            className="w-full border-2 border-[#FF6B00] text-[#FF6B00] font-black text-sm py-4 rounded-2xl transition-colors hover:bg-[#FFF0E0] min-h-[56px] flex items-center justify-center gap-2"
          >
            🎓 Commencer le guide interactif
          </button>
        )}

        {/* ── Offres actives ────────────────────────────────────────────── */}
        {offresActives.length > 0 && (
          <div className="bg-white rounded-3xl px-6 py-6 flex flex-col gap-4 shadow-sm">
            <h2 className="text-sm font-black text-[#0A0A0A] uppercase tracking-wide">
              Offres en cours · {offresActives.length}
            </h2>
            {offresActives.map(o => (
              <OffreRow key={o.id} offre={o} commerce={commerce} />
            ))}
          </div>
        )}

        {/* ── Concours expirés à tirer au sort ─────────────────────────── */}
        {offresExpirees.some(o => o.type_remise === 'concours') && (
          <div className="bg-white rounded-3xl px-6 py-6 flex flex-col gap-5 shadow-sm">
            <h2 className="text-sm font-black text-[#0A0A0A] uppercase tracking-wide">
              🎰 Concours terminés
            </h2>
            {offresExpirees
              .filter(o => o.type_remise === 'concours')
              .map(o => (
                <div key={o.id} className="border border-[#F0F0F0] rounded-2xl px-4 py-4">
                  <p className="text-sm font-bold text-[#0A0A0A] mb-0.5">{o.titre}</p>
                  <p className="text-[11px] text-[#3D3D3D]/50">
                    Terminé le {new Date(o.date_fin).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long',
                    })}
                  </p>
                  <TirageAuSort
                    offre={o}
                    nbParticipants={nbParticipants[o.id] ?? null}
                  />
                </div>
              ))
            }
          </div>
        )}

        {/* ── Offres expirées récentes (non-concours) ───────────────────── */}
        {offresExpirees.filter(o => o.type_remise !== 'concours').length > 0 && (
          <div className="bg-white rounded-3xl px-6 py-6 flex flex-col gap-3 shadow-sm">
            <h2 className="text-sm font-black text-[#0A0A0A] uppercase tracking-wide">
              Offres récentes terminées
            </h2>
            {offresExpirees
              .filter(o => o.type_remise !== 'concours')
              .slice(0, 5)
              .map(o => (
                <OffreRow key={o.id} offre={o} expired />
              ))}
          </div>
        )}

        {/* ── QR code vitrine ──────────────────────────────────────────── */}
        {commerce?.ville && (
          <QRVitrine commerce={commerce} toast={qrToast} setToast={setQrToast} />
        )}

        {/* ── Supprimer ce commerce ─────────────────────────────────────────── */}
        {commerce && user && (
          <DeleteCommerceButton commerceId={commerce.id} ownerUserId={user.id} />
        )}

      </div>

      {/* ── Tutorial overlay (steps 1-3) ─────────────────────────────────── */}
      <TutorialDashboard
        step={tutStep}
        onAdvance={handleTutAdvance}
        onSkip={handleTutSkip}
      />

    </main>
  )
}

/* ── Ligne d'offre ───────────────────────────────────────────────────────── */

function OffreRow({ offre, commerce, expired = false }) {
  const labels = {
    pourcentage:    `${offre.valeur}%`,
    montant_fixe:   `${offre.valeur}€`,
    cadeau:         '🎁',
    produit_offert: '📦',
    service_offert: '✂️',
    concours:       '🎰',
    atelier:        '🎨',
  }

  return (
    <div className={`flex items-center justify-between gap-3 py-1 ${expired ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#0A0A0A] truncate">{offre.titre}</p>
        <p className="text-[11px] text-[#3D3D3D]/50">
          {expired ? 'Terminée' : (
            new Date(offre.date_fin) > new Date()
              ? `Jusqu'à ${new Date(offre.date_fin).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
              : 'Expirée'
          )}
          {offre.nb_bons_restants != null && offre.nb_bons_restants !== 9999 && (
            ` · ${offre.nb_bons_restants} bons restants`
          )}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-sm font-black text-[#FF6B00]">
          {labels[offre.type_remise] ?? offre.type_remise}
        </span>
        {!expired && commerce && (
          <ShareButton
            offre={{ ...offre, commerces: commerce }}
            commerce={commerce}
            shareText={`🎉 Nouvelle offre chez ${commerce.nom} ! ${offre.titre} — Réserve ton bon gratuit 👉 bonmoment.app/offre/${offre.id}`}
            shareTitle={`Nouvelle offre chez ${commerce.nom} — BONMOMENT`}
          />
        )}
      </div>
    </div>
  )
}

/* ── Section QR code vitrine ─────────────────────────────────────────────── */

function QRVitrine({ commerce, toast, setToast }) {
  const [showOverlay, setShowOverlay] = useState(false)
  const qrUrl = `https://bonmoment.app/commercant/${commerce.id}`

  function afficherToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  function telechargerQR() {
    const canvas = document.getElementById('qr-vitrine-canvas')
    if (!canvas) return

    const W = 1240
    const H = 1754
    const out = document.createElement('canvas')
    out.width  = W
    out.height = H
    const ctx = out.getContext('2d')

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, W, H)

    ctx.fillStyle = '#FF6B00'
    ctx.fillRect(0, 0, W, 220)

    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('BONMOMENT', W / 2, 110)
    ctx.font = '28px Arial'
    ctx.fillText('Soyez là au bon moment', W / 2, 165)

    const qrSize = 600
    const qrX    = (W - qrSize) / 2
    const qrY    = 300
    ctx.drawImage(canvas, qrX, qrY, qrSize, qrSize)

    ctx.fillStyle = '#0A0A0A'
    ctx.font = 'bold 36px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Scannez pour découvrir', W / 2, qrY + qrSize + 70)
    ctx.fillText(commerce.nom, W / 2, qrY + qrSize + 120)
    ctx.font = '28px Arial'
    ctx.fillStyle = '#9CA3AF'
    ctx.fillText('sur BONMOMENT', W / 2, qrY + qrSize + 170)

    ctx.fillStyle = '#FF6B00'
    ctx.font = '24px Arial'
    ctx.fillText(qrUrl, W / 2, H - 80)

    const link    = document.createElement('a')
    link.download = `qr-vitrine-${commerce.nom.toLowerCase().replace(/\s+/g, '-')}.png`
    link.href     = out.toDataURL('image/png')
    link.click()
    afficherToast('📥 QR code téléchargé !')
  }

  return (
    <>
      <div className="bg-white rounded-3xl px-6 py-6 flex flex-col gap-3 shadow-sm">
        <h2 className="text-sm font-black text-[#0A0A0A] uppercase tracking-wide">Mon QR code vitrine</h2>
        <p className="text-xs text-[#3D3D3D]/60">
          Tes clients scannent et découvrent directement{' '}
          <span className="font-bold text-[#0A0A0A]">{commerce.nom}</span> sur BONMOMENT.
        </p>

        {/* Bouton 1 : afficher overlay */}
        <button
          onClick={() => setShowOverlay(true)}
          className="w-full bg-[#FF6B00] hover:bg-[#CC5500] text-white font-semibold text-sm py-3 rounded-lg transition-colors min-h-[48px]"
        >
          📲 Afficher mon QR code vitrine
        </button>

        {/* Bouton 2 : télécharger */}
        <button
          onClick={telechargerQR}
          className="w-full bg-[#0A0A0A] hover:bg-[#1A1A1A] text-white font-semibold text-sm py-3 rounded-lg transition-colors min-h-[48px]"
        >
          📥 Télécharger mon QR code
        </button>

        <p className="text-[10px] text-[#3D3D3D]/40 text-center">Format A5 • Prêt pour l'impression</p>
      </div>

      {/* QR canvas caché (pour génération téléchargement) */}
      <div className="hidden">
        <QRCodeCanvas
          id="qr-vitrine-canvas"
          value={qrUrl}
          size={600}
          level="H"
          includeMargin
          fgColor="#0A0A0A"
          bgColor="#FFFFFF"
        />
      </div>

      {/* Overlay plein écran */}
      {showOverlay && (
        <div className="fixed inset-0 z-[90] bg-white flex flex-col items-center justify-center px-6">
          <button
            onClick={() => setShowOverlay(false)}
            className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-[#F5F5F5] text-[#3D3D3D] font-bold text-lg hover:bg-[#E0E0E0] transition-colors"
          >
            ✕
          </button>

          <div className="flex flex-col items-center gap-6 w-full max-w-xs">
            <div className="bg-white border-2 border-[#F0F0F0] rounded-2xl p-5">
              <QRCodeCanvas
                value={qrUrl}
                size={260}
                level="H"
                includeMargin
                fgColor="#0A0A0A"
                bgColor="#FFFFFF"
              />
            </div>

            <p className="text-base font-bold text-[#0A0A0A] text-center leading-snug">
              Scanne pour découvrir{' '}
              <span className="text-[#FF6B00]">{commerce.nom}</span>{' '}
              sur BONMOMENT
            </p>

            <button
              onClick={() => setShowOverlay(false)}
              className="text-sm text-[#3D3D3D]/50 hover:text-[#3D3D3D] transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-[#0A0A0A] text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl max-w-[90vw] text-center">
          {toast}
        </div>
      )}
    </>
  )
}
