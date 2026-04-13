'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'

function SuccesContent() {
  // session_id disponible pour vérifications futures si besoin
  // eslint-disable-next-line no-unused-vars
  const searchParams = useSearchParams()

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center gap-8">

      <Image
        src="/LOGO.png"
        alt="Logo BONMOMENT"
        width={600}
        height={300}
        unoptimized
        priority
        className="w-[130px] h-auto"
      />

      <div className="flex flex-col gap-4 max-w-sm">
        <p className="text-6xl">🎉</p>
        <h1 className="text-2xl font-black text-[#0A0A0A] leading-tight">
          Bienvenue sur BONMOMENT !
        </h1>
        <p className="text-sm text-[#3D3D3D]/80 leading-relaxed">
          Ton premier mois est offert. Ton abonnement sera activé dans quelques instants.
        </p>
        <p className="text-xs text-[#3D3D3D]/40 leading-relaxed">
          Aucun prélèvement pendant 30 jours.
          Tu recevras une confirmation par email.
        </p>
      </div>

      <Link
        href="/commercant/dashboard"
        className="bg-[#FF6B00] hover:bg-[#CC5500] text-white font-black text-sm px-8 py-4 rounded-2xl transition-colors shadow-lg shadow-orange-200 min-h-[52px] flex items-center gap-2"
      >
        Accéder à mon dashboard →
      </Link>

    </main>
  )
}

export default function SuccesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <span className="w-8 h-8 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SuccesContent />
    </Suspense>
  )
}
