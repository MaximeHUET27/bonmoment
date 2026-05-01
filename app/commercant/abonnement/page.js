'use client'

import { useState, useEffect, Suspense, Fragment } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/app/context/AuthContext'

const FEATURES_COMMUNES = [
  'Bons illimités',
  'Statistiques en temps réel',
  'Avis Google automatiques',
  'Rapport mensuel',
]

const PLANS = [
  {
    key:      'decouverte',
    nom:      'Découverte',
    prix:     29,
    offres:   4,
    populaire: false,
    features: ['4 offres/mois', ...FEATURES_COMMUNES],
  },
  {
    key:      'essentiel',
    nom:      'Essentiel',
    prix:     49,
    offres:   8,
    populaire: false,
    features: ['8 offres/mois', ...FEATURES_COMMUNES],
  },
  {
    key:      'pro',
    nom:      'Pro',
    prix:     79,
    offres:   16,
    populaire: true,
    features: ['16 offres/mois', ...FEATURES_COMMUNES],
    fidelite: true,
  },
]

const REMISES = { decouverte: 10, essentiel: 15, pro: 20 }

function AbonnementContent() {
  const { user, loading, supabase } = useAuth()
  const router       = useRouter()
  const searchParams = useSearchParams()

  const isAdmin = user?.email === 'bonmomentapp@gmail.com'

  const [commerce,          setCommerce]          = useState(null)
  const [fetching,          setFetching]          = useState(true)
  const [cgvAccepted,       setCgvAccepted]       = useState(false)
  const [choosing,          setChoosing]          = useState(null)
  const [error,             setError]             = useState(null)
  const [codeInput,         setCodeInput]         = useState('')
  const [codeStatut,        setCodeStatut]        = useState(null)
  const [codeErreur,        setCodeErreur]        = useState(null)
  const [parrainNom,        setParrainNom]        = useState('')
  const [parrainCommerceId, setParrainCommerceId] = useState(null)
  const [codeValue,         setCodeValue]         = useState('')

  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [user, loading, router])

  useEffect(() => {
    if (!user || !supabase) return

    const commerceId = searchParams.get('commerce_id')
    if (!commerceId) { router.replace('/commercant/dashboard'); return }

    supabase
      .from('commerces')
      .select('id, nom, palier, stripe_customer_id, stripe_subscription_id')
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

  async function handleAppliquerCode() {
    if (!codeInput.trim() || !commerce?.id) return
    setCodeStatut('loading')
    setCodeErreur(null)
    try {
      const res = await fetch(
        `/api/parrainage/valider-code?code=${encodeURIComponent(codeInput.trim().toUpperCase())}&commerce_id=${commerce.id}`
      )
      const data = await res.json()
      if (data.valid) {
        setCodeStatut('valid')
        setParrainNom(data.parrain_nom)
        setParrainCommerceId(data.parrain_commerce_id)
        setCodeValue(codeInput.trim().toUpperCase())
      } else {
        setCodeStatut('invalid')
        const msgs = {
          code_inconnu:    "Ce code n'existe pas",
          code_expire:     'Ce code a expiré',
          auto_parrainage: 'Tu ne peux pas utiliser ton propre code',
          limite_atteinte: 'Ce commerçant a atteint sa limite de parrainages ce mois',
          parrain_inactif: "Ce commerçant n'est plus actif",
        }
        setCodeErreur(msgs[data.error] || 'Code invalide')
      }
    } catch {
      setCodeStatut('invalid')
      setCodeErreur('Erreur réseau — réessaie')
    }
  }

  function handleRetirerCode() {
    setCodeInput('')
    setCodeStatut(null)
    setCodeErreur(null)
    setParrainNom('')
    setParrainCommerceId(null)
    setCodeValue('')
  }

  async function handleChoix(palier) {
    if (!cgvAccepted || choosing) return
    if (!commerce?.id) {
      setError('Commerce introuvable — reconnecte-toi ou rafraîchis la page.')
      return
    }
    setChoosing(palier)
    setError(null)

    /* ── Bypass Stripe pour l'admin ── */
    if (isAdmin) {
      try {
        const res  = await fetch('/api/admin/activer-abonnement', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ commerce_id: commerce.id, palier }),
        })
        const data = await res.json()
        if (data.ok) {
          router.replace(`/commercant/dashboard?commerce=${commerce.id}&admin_activated=1`)
        } else {
          setError(data.error || 'Erreur activation admin')
          setChoosing(null)
        }
      } catch (e) {
        setError(e.message)
        setChoosing(null)
      }
      return
    }

    /* ── Flow Stripe normal ── */
    const isFirstSubscription = !commerce?.stripe_customer_id && !commerce?.stripe_subscription_id
    try {
      const res  = await fetch('/api/stripe/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          palier,
          commerce_id:          commerce.id,
          isFirstSubscription,
          ...(codeValue && parrainCommerceId
            ? { code_parrainage: codeValue, parrain_commerce_id: parrainCommerceId }
            : {}),
        }),
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
        {commerce && !commerce.stripe_customer_id && !commerce.stripe_subscription_id ? (
          <>
            <h1 className="text-2xl font-black text-[#0A0A0A]">Choisis ton abonnement — 1<sup>er</sup> mois offert !</h1>
            <p className="text-xs text-[#3D3D3D]/60 mt-1">Sans engagement · Résiliable à tout moment</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black text-[#0A0A0A]">Change ton abonnement</h1>
            <p className="text-xs text-[#3D3D3D]/60 mt-1">Sans engagement · Résiliable à tout moment</p>
          </>
        )}
        {isAdmin && (
          <p className="inline-block mt-2 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
            🔑 Mode admin — activation sans paiement
          </p>
        )}
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

        {/* ── Code parrainage ── */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-[#0A0A0A] uppercase tracking-widest">
            Code de parrainage
          </p>
          {codeStatut !== 'valid' ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={codeInput}
                onChange={e => {
                  setCodeInput(e.target.value.toUpperCase())
                  setCodeErreur(null)
                  if (codeStatut === 'invalid') setCodeStatut(null)
                }}
                onKeyDown={e => e.key === 'Enter' && handleAppliquerCode()}
                placeholder="Code de parrainage (optionnel)"
                maxLength={8}
                style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px' }}
                className={`flex-1 px-4 py-3 border rounded-lg outline-none transition-colors placeholder:text-[#999] ${
                  codeStatut === 'invalid'
                    ? 'border-red-400 bg-red-50'
                    : 'border-[#E0E0E0] focus:border-[#FF6B00]'
                }`}
              />
              <button
                onClick={handleAppliquerCode}
                disabled={!codeInput.trim() || codeStatut === 'loading'}
                style={{ fontFamily: 'Montserrat, sans-serif' }}
                className="bg-[#FF6B00] hover:bg-[#CC5500] active:bg-[#AA4400] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm px-6 py-3 rounded-lg transition-colors whitespace-nowrap min-h-[48px] flex items-center justify-center"
              >
                {codeStatut === 'loading' ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : 'Appliquer'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3 border border-green-500 bg-green-50 rounded-lg">
              <p className="flex-1 text-sm text-green-700 font-semibold">
                ✅ Code accepté — parrainage de {parrainNom}
              </p>
              <button
                onClick={handleRetirerCode}
                className="text-green-700 hover:text-green-900 font-bold text-lg leading-none transition-colors shrink-0"
                aria-label="Retirer le code"
              >
                ✕
              </button>
            </div>
          )}
          {codeStatut === 'invalid' && codeErreur && (
            <p className="text-xs text-red-500 font-semibold">{codeErreur}</p>
          )}
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
                  {codeStatut === 'valid' ? (
                    <>
                      <p className="text-sm line-through text-gray-400 mt-0.5">{plan.prix}€/mois</p>
                      <p className="text-xl font-black text-green-600 leading-tight">
                        {plan.prix - REMISES[plan.key]}€
                        <span className="text-xs font-semibold text-green-600/80"> sur ta 1ère mensualité payante</span>
                      </p>
                      <p className="text-xs text-green-600 mt-0.5">(-{REMISES[plan.key]}€ parrainage)</p>
                      <p className="text-xs text-gray-400 mt-0.5">puis {plan.prix}€/mois</p>
                    </>
                  ) : (
                    <p className="text-2xl font-black text-[#0A0A0A] mt-0.5 leading-none">
                      {plan.prix}€
                      <span className="text-sm font-semibold text-[#3D3D3D]/60">/mois</span>
                    </p>
                  )}
                </div>

                {/* Caractéristiques */}
                <ul className="flex flex-col gap-1.5 text-xs text-[#3D3D3D] flex-1">
                  {plan.features.map((f, i) => {
                    if (i === 0 && plan.fidelite) {
                      return (
                        <Fragment key={f}>
                          <li className="flex items-center gap-2">
                            <span className="text-[#FF6B00] font-bold shrink-0">✓</span>
                            {f}
                          </li>
                          <li className="bg-orange-50 px-2 py-1.5 rounded-md font-bold text-[#3D3D3D]">
                            🎯 Carte de fidélité unique et dématérialisée
                          </li>
                        </Fragment>
                      )
                    }
                    return (
                      <li key={f} className="flex items-center gap-2">
                        <span className="text-[#FF6B00] font-bold shrink-0">✓</span>
                        {f}
                      </li>
                    )
                  })}
                  {!commerce?.stripe_customer_id && !commerce?.stripe_subscription_id && (
                    <li className="flex items-center gap-2">
                      <span className="text-[#FF6B00] font-bold shrink-0">✓</span>
                      1<sup>er</sup> mois offert
                    </li>
                  )}
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
