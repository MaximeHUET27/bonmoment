import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { toSlug } from '@/lib/utils'
import AuthButton from '@/app/components/AuthButton'
import VilleClient from './VilleClient'

export default async function VillePage({ params }) {
  const { slug } = await params

  /* ── Résolution de la ville depuis son slug ── */
  const { data: villes } = await supabase
    .from('villes')
    .select('*')
    .eq('active', true)

  const ville = villes?.find(v => toSlug(v.nom) === slug)

  if (!ville) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl mb-4">😕</p>
        <p className="text-[#0A0A0A] font-bold text-lg mb-2">Ville introuvable</p>
        <p className="text-[#3D3D3D] text-sm mb-6">
          Cette ville n'est pas encore disponible sur BONMOMENT.
        </p>
        <Link href="/" className="text-[#FF6B00] font-semibold underline underline-offset-2">
          ← Retour à l'accueil
        </Link>
      </main>
    )
  }

  /* ── Toutes les offres actives (y compris expirées, affichées en grisé) ── */
  const { data: offres } = await supabase
    .from('offres')
    .select(`
      *,
      commerces!inner (
        nom,
        categorie,
        adresse,
        ville,
        photo_url
      )
    `)
    .eq('commerces.ville', ville.nom)
    .eq('statut', 'active')
    .order('date_fin', { ascending: true })

  return (
    <main className="min-h-screen bg-white flex flex-col">

      {/* ── Header ─── */}
      <header className="bg-white border-b border-[#F0F0F0] px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <Link href="/">
          <Image
            src="/LOGO.png"
            alt="BONMOMENT"
            width={600}
            height={300}
            unoptimized
            priority
            className="w-[110px] h-auto"
          />
        </Link>
        <div className="bg-white rounded-full shadow-sm">
          <AuthButton />
        </div>
      </header>

      {/* ── Interface interactive : bandeau, urgence, filtres, grille ── */}
      <VilleClient offres={offres || []} villeNom={ville.nom} />

      {/* ── Footer ── */}
      <footer className="px-6 py-8 text-center border-t border-[#F5F5F5]">
        <p className="text-sm text-[#3D3D3D]">
          Vous êtes commerçant ?{' '}
          <a
            href="/commercant/inscription"
            className="font-semibold text-[#FF6B00] hover:text-[#CC5500] underline underline-offset-2 transition-colors"
          >
            Rejoignez BONMOMENT
          </a>
        </p>
      </footer>

    </main>
  )
}
