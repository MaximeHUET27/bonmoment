'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/app/context/AuthContext'
import SignInPanel from '@/app/components/SignInPanel'

function ConnexionContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Sanitise : accepte uniquement un chemin local
  const rawNext = searchParams.get('next') ?? '/'
  const next = rawNext.startsWith('/') ? rawNext : '/'

  // Déjà connecté → redirection immédiate vers la page d'origine
  useEffect(() => {
    if (!loading && user) {
      router.replace(next)
    }
  }, [user, loading, router, next])

  // Spinner pendant la vérification de session ou la redirection
  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <span className="w-8 h-8 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center">

      {/* ── Logo ──────────────────────────────────────────────────────────── */}
      <header className="w-full flex justify-center pt-12 pb-2 px-6">
        <Link href="/" aria-label="Accueil BONMOMENT">
          <Image
            src="/LOGO.png"
            alt="BONMOMENT"
            width={600}
            height={300}
            unoptimized
            priority
            className="w-[150px] h-auto"
          />
        </Link>
      </header>

      {/* ── Corps centré ──────────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center w-full px-6 py-10">
        <div className="w-full max-w-[340px] flex flex-col gap-8">

          {/* Titre */}
          <div className="text-center">
            <h1 className="text-[28px] font-black text-[#0A0A0A] leading-tight tracking-tight">
              Connecte-toi pour<br />rejoindre ta ville
            </h1>
            <p className="text-sm text-[#3D3D3D]/60 mt-2">
              Gratuit · Sans mot de passe · 10 secondes
            </p>
          </div>

          {/* Boutons OAuth — Google + Facebook */}
          <SignInPanel redirectAfter={next} showLegal={false} />

          {/* Mention légale */}
          <p className="text-center text-[11px] text-[#3D3D3D]/40 leading-relaxed -mt-4">
            En te connectant, tu acceptes nos{' '}
            <Link
              href="/cgu"
              target="_blank"
              className="underline underline-offset-2 hover:text-[#FF6B00] transition-colors"
            >
              CGU
            </Link>{' '}
            et notre{' '}
            <Link
              href="/confidentialite"
              target="_blank"
              className="underline underline-offset-2 hover:text-[#FF6B00] transition-colors"
            >
              Politique de confidentialité
            </Link>.
          </p>

        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="w-full px-6 pb-8 text-center">
        <Link
          href="/"
          className="text-xs text-[#3D3D3D]/40 hover:text-[#FF6B00] transition-colors"
        >
          ← Retour à l'accueil
        </Link>
      </footer>

    </main>
  )
}

// Suspense obligatoire : useSearchParams() est asynchrone dans App Router
export default function ConnexionPage() {
  return (
    <Suspense>
      <ConnexionContent />
    </Suspense>
  )
}
