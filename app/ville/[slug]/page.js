import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { toSlug } from '@/lib/utils'
import AuthButton from '@/app/components/AuthButton'
import VilleClient from './VilleClient'

export default async function VillePage({ params }) {
  const { slug } = await params
  const supabase = await createClient()

  /* ── Résolution de la ville depuis son slug ── */
  const { data: villes } = await supabase
    .from('villes')
    .select('id, nom')
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
        id,
        nom,
        categorie,
        adresse,
        ville,
        photo_url,
        note_google
      )
    `)
    .eq('commerces.ville', ville.nom)
    .order('date_fin', { ascending: true })

  return (
    <main className="min-h-screen bg-white flex flex-col">

      {/* ── Header ─── */}
      <header className="bg-white border-b border-[#F0F0F0] px-4 py-3 flex items-center justify-between sticky top-0 z-40">
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
      <VilleClient offres={offres || []} villeNom={ville.nom} villes={villes || []} />


    </main>
  )
}
