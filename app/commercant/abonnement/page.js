'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/app/context/AuthContext'

const PLANS = [
  {
    key:      'decouverte',
    nom:      'Découverte',
    prix:     29,
    offres:   4,
    populaire: false,
  },
  {
    key:      'essentiel',
    nom:      'Essentiel',
    prix:     49,
    offres:   8,
    populaire: true,
  },
  {
    key:      'pro',
    nom:      'Pro',
    prix:     79,
    offres:   16,
    populaire: false,
  },
]

function AbonnementContent() {
  const { user, loading, supabase } = useAuth()
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [commerce,      setCommerce]      = useState(null)
  const [fetching,      setFetching]      = useState(true)
  const [cgvAccepted,   setCgvAccepted]   = useState(false)
  const [choosing,      setChoosing]      = useState(null)   // clé du palier en cours de traitement
  const [error,         setError]         = useState(null)

  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [user, loading, router])

  useEffect(() => {
    if (!user || !supabase) return

    const commerceId = searchParams.get('commerce_id')
    if (!commerceId) { router.replace('/commercant/dashboard'); return }

    supabase
      .from('commerces')
      .select('id, nom, palier')
      .eq('id', commerceId)
      .eq('owner_id', user.id)   // vérifie l'appartenance
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          console.error('Commerce introuvable ou accès refusé:', error)
          router.replace('/commercant/dashboard')
          return
        }
        setCommerce(data)
        setFetching(false)
      })
  }, [user, supabase, searchParams, router])

  async function handleChoix(palier) {
    if (!cgvAccepted || choosing) return
    if (!commerce?.id) {
      setError('Commerce introuvable — reconnecte-toi ou rafraîchis la page.')
      return
    }
    setChoosing(palier)
    setError(null)

    try {
      const res  = await fetch('/api/stripe/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ palier, commerce_id: commerce.id }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Erreur lors de la création de la session Stripe')
        setChoosing(null)
      }
    } catch (e) {
      setError(e.message)
      setChoosing(null)
    }
  }

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="w-8 h-8 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">

      <header className="px-6 pt-8 pb-6 border-b border-[#F5F5F5] text-center">
        <Link href="/" className="inline-block mb-4">
          <Image src="/LOGO.png" alt="Logo BONMOMENT" width={600} height={300} unoptimized priority className="w-[110px] h-auto mx-auto" />
        </Link>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF6B00] mb-1">Espace commerçant</p>
        <h1 className="text-2xl font-black text-[#0A0A0A]">Choisir un palier</h1>
        <p className="text-xs text-[#3D3D3D]/60 mt-1">
          Premier mois offert · Sans engagement · Résiliable à tout moment
        </p>
      </header>

      <section className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full flex flex-col gap-5">

        {/* ── CGV + TVA — EN HAUT, avant les cartes ── */}
        <div className="bg-[#F5F5F5] rounded-2xl px-4 py-4 flex flex-col gap-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={cgvAccepted}
              onChange={() => setCgvAccepted(!cgvAccepted)}
              className="mt-0.5 w-4 h-4 accent-[#FF6B00] flex-shrink-0 cursor-pointer"
            />
            <p className="text-xs text-[#3D3D3D] leading-relaxed select-none">
              J&apos;accepte les{' '}
              <Link href="/cgv" target="_blank" className="text-[#FF6B00] font-semibold underline underline-offset-2 hover:text-[#CC5500]">
                Conditions Générales de Vente
              </Link>
              {' '}de BONMOMENT.
            </p>
          </label>
          <p className="text-[11px] text-[#3D3D3D]/40 ml-7">
            TVA non applicable, article 293 B du CGI.
          </p>
        </div>

        {/* ── Cartes paliers — row sur desktop, colonne sur mobile ── */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-3 md:items-stretch">
          {PLANS.map(plan => {
            const isDisabled = !cgvAccepted || choosing !== null
            return (
              <div
                key={plan.key}
                className={`relative bg-white rounded-3xl px-5 py-6 flex flex-col gap-3 border-2 transition-all flex-1 md:max-w-[280px] ${
                  plan.populaire
                    ? 'border-[#FF6B00] shadow-lg shadow-orange-100 md:scale-[1.03]'
                    : 'border-[#F0F0F0]'
                }`}
              >
                {/* Badge populaire */}
                {plan.populaire && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#FF6B00] text-white text-[10px] font-black px-3 py-1 rounded-full whitespace-nowrap">
                    ⭐ Populaire
                  </div>
                )}

                {/* En-tête */}
                <div>
                  <p className={`text-lg font-black ${plan.populaire ? 'text-[#FF6B00]' : 'text-[#0A0A0A]'}`}>
                    {plan.nom}
                  </p>
                  <p className="text-2xl font-black text-[#0A0A0A] mt-0.5 leading-none">
                    {plan.prix}€
                    <span className="text-sm font-semibold text-[#3D3D3D]/60">/mois</span>
                  </p>
                </div>

                {/* Caractéristiques */}
                <ul className="flex flex-col gap-1.5 text-sm text-[#3D3D3D] flex-1">
                  <li className="flex items-center gap-2">
                    <span className="text-[#FF6B00] font-bold">✓</span>
                    {plan.offres} offres/mois
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#FF6B00] font-bold">✓</span>
                    Bons illimités
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#FF6B00] font-bold">✓</span>
                    1<sup>er</sup> mois offert
                  </li>
                </ul>

                {/* Bouton — style piloté par React, pas par CSS :disabled */}
                <button
                  onClick={() => handleChoix(plan.key)}
                  disabled={isDisabled}
                  className={`w-full font-black text-sm py-3.5 rounded-2xl transition-colors min-h-[48px] flex items-center justify-center gap-2 ${
                    isDisabled
                      ? 'bg-[#D0D0D0] text-white cursor-not-allowed opacity-60'
                      : plan.populaire
                        ? 'bg-[#FF6B00] hover:bg-[#CC5500] text-white cursor-pointer'
                        : 'border-2 border-[#FF6B00] text-[#FF6B00] hover:bg-[#FFF0E0] bg-transparent cursor-pointer'
                  }`}
                >
                  {choosing === plan.key
                    ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    : 'Choisir ce palier'
                  }
                </button>
              </div>
            )
          })}
        </div>

        {!cgvAccepted && (
          <p className="text-center text-xs text-[#3D3D3D]/50">
            Accepte les CGV pour continuer
          </p>
        )}

        {/* ── Erreur ── */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <p className="text-xs text-red-600 font-semibold">{error}</p>
          </div>
        )}

        {/* ── Note CB ── */}
        <p className="text-center text-xs text-[#3D3D3D]/40 leading-relaxed">
          Tu seras redirigé vers Stripe pour enregistrer ta carte bancaire.
          <br />Aucun prélèvement pendant les 30 premiers jours.
        </p>

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

export default function AbonnementPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <span className="w-8 h-8 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AbonnementContent />
    </Suspense>
  )
}
