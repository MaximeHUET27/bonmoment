import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { toSlug } from '@/lib/utils'
import OffreCard from './OffreCard'

export default async function VillePage({ params }) {
  const { slug } = await params

  // Trouver la ville correspondant au slug
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
        <p className="text-[#3D3D3D] text-sm mb-6">Cette ville n'est pas encore disponible sur BONMOMENT.</p>
        <Link href="/" className="text-[#FF6B00] font-semibold underline underline-offset-2">
          ← Retour à l'accueil
        </Link>
      </main>
    )
  }

  // Offres actives pour cette ville
  const now = new Date().toISOString()
  const { data: offres } = await supabase
    .from('offres')
    .select(`
      *,
      commerces!inner (
        nom,
        categorie,
        ville
      )
    `)
    .eq('commerces.ville', ville.nom)
    .eq('statut', 'active')
    .gt('date_fin', now)
    .gt('nb_bons_restants', 0)
    .order('date_fin', { ascending: true })

  return (
    <main className="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <header className="px-6 pt-8 pb-6 text-center border-b border-[#F5F5F5]">
        <Link href="/" className="inline-block mb-4">
          <Image
            src="/LOGO.png"
            alt="Logo BONMOMENT"
            width={600}
            height={300}
            unoptimized
            priority
            className="w-[130px] h-auto mx-auto"
          />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-[#0A0A0A] tracking-tight">
          {ville.nom}
        </h1>
        <p className="text-sm text-[#3D3D3D] mt-1">
          {offres && offres.length > 0
            ? `${offres.length} bon${offres.length > 1 ? 's plans' : ' plan'} de ta ville en ce moment`
            : 'Vos commerçants préparent des surprises... Revenez bientôt !'}
        </p>
      </header>

      {/* Liste des offres */}
      <section className="flex-1 px-4 py-8 w-full max-w-lg mx-auto">
        {offres && offres.length > 0 ? (
          <div className="flex flex-col gap-4">
            {offres.map(offre => (
              <OffreCard key={offre.id} offre={offre} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl mb-5">🕐</div>
            <p className="text-[#0A0A0A] font-black text-lg mb-2">
              Vos commerçants préparent des surprises...
            </p>
            <p className="text-[#3D3D3D] text-sm">Revenez bientôt !</p>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="px-6 py-10 text-center border-t border-[#F5F5F5]">
        <p className="text-sm text-[#3D3D3D]">
          Vous êtes commerçant ?{' '}
          <a
            href="/commercant"
            className="font-semibold text-[#FF6B00] hover:text-[#CC5500] underline underline-offset-2 transition-colors"
          >
            Rejoignez BONMOMENT
          </a>
        </p>
      </footer>

    </main>
  )
}
