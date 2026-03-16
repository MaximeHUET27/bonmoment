'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/app/context/AuthContext'

export default function DashboardPage() {
  const { user, loading, supabase, signOut } = useAuth()
  const router = useRouter()
  const [commerce, setCommerce] = useState(null)
  const [fetching, setFetching] = useState(true)

  // Auth guard
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/')
    }
  }, [user, loading, router])

  // Fetch commerce du commerçant connecté
  useEffect(() => {
    if (!user) return
    supabase
      .from('commerces')
      .select('id, nom, categorie, ville, adresse, code_parrainage, code_parrainage_expire_at, note_google')
      .eq('owner_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setCommerce(data)
        setFetching(false)
      })
  }, [user, supabase])

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <span className="w-8 h-8 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const prenom = user.user_metadata?.full_name?.split(' ')[0]
    ?? user.user_metadata?.name?.split(' ')[0]
    ?? 'commerçant'

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
        <button
          onClick={() => signOut().then(() => router.push('/'))}
          className="text-xs text-[#3D3D3D]/60 hover:text-[#FF6B00] transition-colors"
        >
          Déconnexion
        </button>
      </header>

      {/* ── Corps ────────────────────────────────────────────────────────── */}
      <div className="flex-1 w-full max-w-xl mx-auto px-5 py-10 flex flex-col gap-6">

        {/* Message de bienvenue */}
        <div className="bg-white rounded-3xl px-6 py-8 flex flex-col gap-2 shadow-sm">
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

        {/* Infos commerce */}
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
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
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

        {/* CTA — Créer ma première offre */}
        {commerce && (
          <Link
            href={`/commercant/${commerce.id}/offre/nouvelle`}
            className="w-full bg-[#FF6B00] hover:bg-[#CC5500] text-white font-black text-base py-4 rounded-2xl transition-colors duration-200 shadow-lg shadow-orange-200 min-h-[56px] flex items-center justify-center text-center"
          >
            ✨ Créer ma première offre
          </Link>
        )}

      </div>
    </main>
  )
}
