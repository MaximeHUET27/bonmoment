'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/app/context/AuthContext'
import SignInPanel from '@/app/components/SignInPanel'

// Les avantages affichés sur la page (arguments pour se connecter)
const AVANTAGES = [
  { icon: '🎫', label: 'Réserve des bons plans en 30 secondes' },
  { icon: '🏘️', label: 'Suis les commerçants de ta ville' },
  { icon: '🔔', label: 'Reçois les alertes avant tout le monde' },
  { icon: '🏅', label: 'Gagne des badges Habitant, Bon habitant...' },
  { icon: '🔒', label: 'Sans mot de passe · 100 % gratuit' },
]

function ConnexionContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'

  // Si déjà connecté → redirection immédiate
  useEffect(() => {
    if (!loading && user) {
      router.replace(next.startsWith('/') ? next : '/')
    }
  }, [user, loading, router, next])

  if (loading || user) {
    // Écran de chargement pendant la vérification / redirection
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <header className="px-6 pt-10 pb-0 flex flex-col items-center">
        <Link href="/">
          <Image
            src="/LOGO.png"
            alt="BONMOMENT"
            width={600}
            height={300}
            unoptimized
            priority
            className="w-[140px] h-auto"
          />
        </Link>
      </header>

      {/* Corps */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-sm mx-auto w-full">

        {/* Accroche */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-[#0A0A0A] leading-tight mb-2">
            Soyez là<br />au bon moment
          </h1>
          <p className="text-sm text-[#3D3D3D]/70">
            Rejoins ta ville et ne rate plus aucun bon plan.
          </p>
        </div>

        {/* Liste des avantages */}
        <ul className="w-full flex flex-col gap-3 mb-8">
          {AVANTAGES.map(({ icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-sm text-[#3D3D3D]">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#FFF0E0] flex items-center justify-center text-base">
                {icon}
              </span>
              {label}
            </li>
          ))}
        </ul>

        {/* Panel de connexion */}
        <div className="w-full">
          <SignInPanel redirectAfter={next} />
        </div>

      </section>

      {/* Footer minimal */}
      <footer className="px-6 py-6 text-center">
        <Link href="/" className="text-xs text-[#3D3D3D]/40 hover:text-[#FF6B00] transition-colors">
          ← Retour à l'accueil sans connexion
        </Link>
      </footer>

    </main>
  )
}

// Suspense requis par useSearchParams dans Next.js App Router
export default function ConnexionPage() {
  return (
    <Suspense>
      <ConnexionContent />
    </Suspense>
  )
}
