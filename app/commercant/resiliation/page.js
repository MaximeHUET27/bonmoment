'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/app/context/AuthContext'

function ResiliationContent() {
  const { user, loading, supabase } = useAuth()
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [commerce,   setCommerce]   = useState(null)
  const [stats,      setStats]      = useState(null)
  const [fetching,   setFetching]   = useState(true)
  const [step,       setStep]       = useState('menu')   // 'menu' | 'confirm1' | 'confirm2' | 'pause_done' | 'resil_done'
  const [processing, setProcessing] = useState(false)
  const [error,      setError]      = useState(null)

  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [user, loading, router])

  useEffect(() => {
    if (!user || !supabase) return

    const commerceId = searchParams.get('commerce_id')
    if (!commerceId) { router.replace('/commercant/dashboard'); return }

    async function load() {
      const { data: com, error: comErr } = await supabase
        .from('commerces')
        .select('id, nom, palier, abonnement_actif, stripe_subscription_id, stripe_customer_id, created_at')
        .eq('id', commerceId)
        .eq('owner_id', user.id)
        .single()

      if (comErr || !com) {
        router.replace('/commercant/dashboard')
        return
      }

      setCommerce(com)

      if (com.id) {
        const [{ count: nbOffres }, { data: offresData }] = await Promise.all([
          supabase.from('offres').select('id', { count: 'exact', head: true }).eq('commerce_id', com.id),
          supabase.from('offres').select('id').eq('commerce_id', com.id),
        ])

        const offreIds = (offresData || []).map(o => o.id)

        let nbBons    = 0
        let nbClients = 0

        if (offreIds.length > 0) {
          const [{ count: bons }, { data: clientsData }] = await Promise.all([
            supabase.from('reservations').select('id', { count: 'exact', head: true })
              .in('offre_id', offreIds).eq('statut', 'utilisee'),
            supabase.from('reservations').select('user_id').in('offre_id', offreIds),
          ])
          nbBons    = bons ?? 0
          nbClients = new Set((clientsData || []).map(r => r.user_id)).size
        }

        const { count: nbAvis }      = await supabase
          .from('avis_google_clics').select('id', { count: 'exact', head: true }).eq('commerce_id', com.id)
        const { count: nbFeedbacks } = await supabase
          .from('feedbacks_commerce').select('id', { count: 'exact', head: true }).eq('commerce_id', com.id)

        const created = com.created_at ? new Date(com.created_at) : new Date()
        const mois    = Math.max(1, Math.round((new Date() - created) / (1000 * 60 * 60 * 24 * 30)))

        const PALIER_LABELS = { decouverte: 'Découverte', essentiel: 'Essentiel', pro: 'Pro' }

        setStats({
          nbOffres:    nbOffres    ?? 0,
          nbBons,
          nbClients,
          nbAvis:      nbAvis      ?? 0,
          nbFeedbacks: nbFeedbacks ?? 0,
          mois,
          palierLabel: PALIER_LABELS[com.palier] || '—',
        })
      }

      setFetching(false)
    }

    load()
  }, [user, supabase, searchParams, router])

  async function handlePause() {
    if (!commerce?.id || processing) return
    setProcessing(true)
    setError(null)
    try {
      const res  = await fetch('/api/stripe/resiliation', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ commerce_id: commerce.id, action: 'pause' }),
      })
      const data = await res.json()
      if (data.ok) setStep('pause_done')
      else setError(data.error || 'Erreur lors de la mise en pause')
    } catch (e) {
      setError(e.message)
    } finally {
      setProcessing(false)
    }
  }

  async function handleResilier() {
    if (!commerce?.id || processing) return
    setProcessing(true)
    setError(null)
    try {
      const res  = await fetch('/api/stripe/resiliation', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ commerce_id: commerce.id, action: 'resilier' }),
      })
      const data = await res.json()
      if (data.ok) setStep('resil_done')
      else setError(data.error || 'Erreur lors de la résiliation')
    } catch (e) {
      setError(e.message)
    } finally {
      setProcessing(false)
    }
  }

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="w-8 h-8 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  /* ── DONE STATES ── */

  if (step === 'pause_done') {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center gap-8">
        <Image src="/LOGO.png" alt="Logo BONMOMENT" width={600} height={300} unoptimized priority className="w-[110px] h-auto" />
        <div className="flex flex-col gap-4 max-w-sm">
          <p className="text-5xl">⏸</p>
          <h1 className="text-2xl font-black text-[#0A0A0A]">Abonnement mis en pause</h1>
          <p className="text-sm text-[#3D3D3D]/70 leading-relaxed">
            Ton abonnement est suspendu pour 30 jours. Aucun prélèvement pendant cette période.
            Il reprendra automatiquement à l&apos;issue du mois de pause.
          </p>
        </div>
        <Link href="/commercant/dashboard" className="bg-[#FF6B00] hover:bg-[#CC5500] text-white font-black text-sm px-8 py-4 rounded-2xl transition-colors">
          Retour au dashboard →
        </Link>
      </main>
    )
  }

  if (step === 'resil_done') {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center gap-8">
        <Image src="/LOGO.png" alt="Logo BONMOMENT" width={600} height={300} unoptimized priority className="w-[110px] h-auto" />
        <div className="flex flex-col gap-4 max-w-sm">
          <p className="text-5xl">👋</p>
          <h1 className="text-2xl font-black text-[#0A0A0A]">Résiliation confirmée</h1>
          <p className="text-sm text-[#3D3D3D]/70 leading-relaxed">
            Ton abonnement a été résilié. Tu conserves l&apos;accès aux fonctionnalités jusqu&apos;à
            la fin de la période en cours.
          </p>
          {commerce?.stripe_subscription_id && (
            <p className="text-xs text-[#3D3D3D]/40">Tu recevras un email de confirmation Stripe.</p>
          )}
        </div>
        <Link href="/commercant/dashboard" className="bg-[#FF6B00] hover:bg-[#CC5500] text-white font-black text-sm px-8 py-4 rounded-2xl transition-colors">
          Retour au dashboard →
        </Link>
      </main>
    )
  }

  /* ── L'utilisateur a un abonnement actif si abonnement_actif ET palier non null ── */
  const hasAbonnement = commerce?.abonnement_actif === true && commerce?.palier != null
  /* La pause n'est disponible que pour les abonnements Stripe (pas admin-bypass) */
  const hasStripe     = Boolean(commerce?.stripe_subscription_id)

  return (
    <main className="min-h-screen bg-white flex flex-col">

      <header className="px-6 pt-8 pb-6 border-b border-[#F5F5F5] text-center">
        <Link href="/" className="inline-block mb-4">
          <Image src="/LOGO.png" alt="Logo BONMOMENT" width={600} height={300} unoptimized priority className="w-[110px] h-auto mx-auto" />
        </Link>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF6B00] mb-1">Espace commerçant</p>
        <h1 className="text-2xl font-black text-[#0A0A0A]">Gérer mon abonnement</h1>
      </header>

      <section className="flex-1 px-4 py-8 max-w-lg mx-auto w-full flex flex-col gap-6">

        {/* ── Bilan ── */}
        <div className="bg-[#F5F5F5] rounded-3xl px-6 py-5 flex flex-col gap-4">
          <h2 className="text-xs font-black text-[#0A0A0A] uppercase tracking-widest">Ton bilan BONMOMENT</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl px-4 py-3 flex flex-col gap-0.5">
              <p className="text-2xl font-black text-[#FF6B00]">{stats?.nbOffres ?? '—'}</p>
              <p className="text-[11px] text-[#3D3D3D]/60">✨ offres publiées</p>
            </div>
            <div className="bg-white rounded-2xl px-4 py-3 flex flex-col gap-0.5">
              <p className="text-2xl font-black text-[#FF6B00]">{stats?.nbBons ?? '—'}</p>
              <p className="text-[11px] text-[#3D3D3D]/60">🎟 bons utilisés</p>
            </div>
            <div className="bg-white rounded-2xl px-4 py-3 flex flex-col gap-0.5">
              <p className="text-2xl font-black text-[#FF6B00]">{stats?.nbClients ?? '—'}</p>
              <p className="text-[11px] text-[#3D3D3D]/60">👥 clients touchés</p>
            </div>
            <div className="bg-white rounded-2xl px-4 py-3 flex flex-col gap-0.5">
              <p className="text-2xl font-black text-[#FF6B00]">{stats?.nbAvis ?? '—'}</p>
              <p className="text-[11px] text-[#3D3D3D]/60">⭐ avis Google générés</p>
            </div>
            <div className="bg-white rounded-2xl px-4 py-3 flex flex-col gap-0.5">
              <p className="text-2xl font-black text-[#FF6B00]">{stats?.nbFeedbacks ?? '—'}</p>
              <p className="text-[11px] text-[#3D3D3D]/60">💬 retours clients</p>
            </div>
            <div className="bg-white rounded-2xl px-4 py-3 flex flex-col gap-0.5">
              <p className="text-2xl font-black text-[#FF6B00]">{stats?.mois ?? '—'}</p>
              <p className="text-[11px] text-[#3D3D3D]/60">📅 mois avec nous</p>
            </div>
          </div>
          {stats?.palierLabel && (
            <p className="text-xs text-center text-[#3D3D3D]/40">
              Palier actuel : <strong className="text-[#FF6B00]">{stats.palierLabel}</strong>
            </p>
          )}
        </div>

        {/* ── Pas d'abonnement ── */}
        {!hasAbonnement && (
          <div className="bg-orange-50 border border-orange-200 rounded-3xl px-6 py-5 flex flex-col gap-3 text-center">
            <p className="text-sm font-bold text-orange-800">Aucun abonnement actif</p>
            <p className="text-xs text-orange-700/70">Tu n&apos;as pas encore souscrit à un abonnement BONMOMENT.</p>
            <Link
              href={`/commercant/abonnement?commerce_id=${commerce?.id}`}
              className="self-center bg-[#FF6B00] hover:bg-[#CC5500] text-white font-black text-sm px-6 py-3 rounded-2xl transition-colors"
            >
              Activer mon abonnement →
            </Link>
          </div>
        )}

        {/* ── Pause (Stripe uniquement) ── */}
        {hasAbonnement && hasStripe && step === 'menu' && (
          <div className="bg-blue-50 border border-blue-200 rounded-3xl px-6 py-5 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-black text-blue-900">⏸ Faire une pause d&apos;un mois</h2>
              <p className="text-xs text-blue-700/80 leading-relaxed">
                Ton compte reste actif. Aucun prélèvement pendant 30 jours.
                L&apos;abonnement reprend automatiquement ensuite.
              </p>
            </div>
            <button
              onClick={handlePause}
              disabled={processing}
              className={`w-full font-black text-sm py-3 rounded-2xl transition-colors flex items-center justify-center gap-2 min-h-[44px] text-white ${
                processing ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
              }`}
            >
              {processing
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : 'Mettre en pause 1 mois'
              }
            </button>
          </div>
        )}

        {/* ── Résiliation (tous abonnements actifs) ── */}
        {hasAbonnement && step === 'menu' && (
          <div className="flex flex-col gap-2 items-center">
            <button
              onClick={() => setStep('confirm1')}
              className="text-xs text-[#3D3D3D]/50 hover:text-red-500 transition-colors underline underline-offset-2"
            >
              Je souhaite résilier mon abonnement
            </button>
          </div>
        )}

        {/* ── Confirm step 1 ── */}
        {step === 'confirm1' && (
          <div className="bg-red-50 border border-red-200 rounded-3xl px-6 py-5 flex flex-col gap-4">
            <h2 className="text-sm font-black text-red-800">Tu es sûr(e) de vouloir résilier ?</h2>
            <p className="text-xs text-red-700/80 leading-relaxed">
              Ton abonnement sera résilié immédiatement.
              Tes offres seront désactivées et tu perdras l&apos;accès au dashboard commerçant.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setStep('confirm2')}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-black text-sm py-3 rounded-2xl transition-colors min-h-[44px]"
              >
                Oui, je veux résilier
              </button>
              <button
                onClick={() => setStep('menu')}
                className="w-full border-2 border-[#E0E0E0] text-[#3D3D3D] font-bold text-sm py-3 rounded-2xl transition-colors hover:border-[#FF6B00] hover:text-[#FF6B00] min-h-[44px]"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* ── Confirm step 2 ── */}
        {step === 'confirm2' && (
          <div className="bg-red-50 border border-red-200 rounded-3xl px-6 py-5 flex flex-col gap-4">
            <h2 className="text-sm font-black text-red-800">Dernière confirmation</h2>
            <p className="text-xs text-red-700/80 leading-relaxed">
              Cette action est irréversible. Clique sur le bouton ci-dessous pour confirmer la résiliation définitive.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleResilier}
                disabled={processing}
                className={`w-full font-black text-sm py-3 rounded-2xl transition-colors flex items-center justify-center gap-2 min-h-[44px] text-white ${
                  processing ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 cursor-pointer'
                }`}
              >
                {processing
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : 'Confirmer la résiliation'
                }
              </button>
              <button
                onClick={() => setStep('menu')}
                className="w-full border-2 border-[#E0E0E0] text-[#3D3D3D] font-bold text-sm py-3 rounded-2xl transition-colors hover:border-[#FF6B00] hover:text-[#FF6B00] min-h-[44px]"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* ── Erreur ── */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <p className="text-xs text-red-600 font-semibold">{error}</p>
          </div>
        )}

        <Link
          href="/commercant/dashboard"
          className="text-center text-xs text-[#3D3D3D]/50 hover:text-[#FF6B00] transition-colors"
        >
          ← Retour au dashboard
        </Link>

      </section>
    </main>
  )
}

export default function ResiliationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <span className="w-8 h-8 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResiliationContent />
    </Suspense>
  )
}
