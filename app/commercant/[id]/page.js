import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { toSlug } from '@/lib/utils'
import OffreCard from '@/app/ville/[slug]/OffreCard'
import FavoriButton from '@/app/components/FavoriButton'

export default async function CommercantPage({ params }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: commerce }, { data: offres }] = await Promise.all([
    supabase.from('commerces').select('id, nom, categorie, adresse, ville, description, photo_url, abonnement_actif').eq('id', id).single(),
    supabase
      .from('offres')
      .select('*')
      .eq('commerce_id', id)
      .eq('statut', 'active')
      .gt('date_fin', new Date().toISOString())
      .gt('nb_bons_restants', 0)
      .order('date_fin', { ascending: true }),
  ])

  if (!commerce) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl mb-4">😕</p>
        <p className="text-[#0A0A0A] font-bold text-lg mb-2">Commerçant introuvable</p>
        <Link href="/" className="text-[#FF6B00] font-semibold underline underline-offset-2">
          ← Retour à l'accueil
        </Link>
      </main>
    )
  }

  const villeSlug = commerce.ville ? toSlug(commerce.ville) : null

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
      </header>

      {/* Fiche commerce */}
      <section className="px-4 pt-8 pb-4 w-full max-w-lg mx-auto">

        {/* Photo ou placeholder */}
        <div className="w-full h-40 rounded-2xl bg-[#FFF0E0] flex items-center justify-center mb-5 overflow-hidden">
          {commerce.photo_url ? (
            <img src={commerce.photo_url} alt={commerce.nom} className="w-full h-full object-cover" />
          ) : (
            <span className="text-6xl">🏪</span>
          )}
        </div>

        {/* Infos */}
        <p className="text-xs font-semibold text-[#FF6B00] uppercase tracking-widest mb-1">
          {commerce.categorie}
        </p>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-black text-[#0A0A0A]">{commerce.nom}</h1>
          <FavoriButton commerceId={commerce.id} commerceNom={commerce.nom || ''} />
        </div>
        {commerce.adresse && (
          <p className="text-sm text-[#3D3D3D] mb-1">📍 {commerce.adresse}{commerce.ville ? `, ${commerce.ville}` : ''}</p>
        )}
        {commerce.description && (
          <p className="text-sm text-[#3D3D3D] leading-relaxed mt-3 mb-2">{commerce.description}</p>
        )}
        {villeSlug && (
          <Link
            href={`/ville/${villeSlug}`}
            className="inline-block mt-2 mb-6 text-xs font-semibold text-[#FF6B00] underline underline-offset-2"
          >
            Voir tous les bons plans de {commerce.ville}
          </Link>
        )}

        {/* Offres actives */}
        <h2 className="text-base font-black text-[#0A0A0A] mb-4">
          Bons plans en cours
        </h2>

        {offres && offres.length > 0 ? (
          <div className="flex flex-col gap-4">
            {offres.map(offre => (
              <OffreCard key={offre.id} offre={{ ...offre, commerces: commerce }} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">🕐</p>
            <p className="text-[#0A0A0A] font-bold text-sm">Tes commerçants préparent des surprises...</p>
            <p className="text-[#3D3D3D] text-xs mt-1">Reviens bientôt !</p>
          </div>
        )}

      </section>

      {/* Footer */}
      <footer className="px-6 py-10 mt-4 text-center border-t border-[#F5F5F5]">
        <p className="text-sm text-[#3D3D3D]">
          Tu es commerçant ?{' '}
          <a
            href="/commercant"
            className="font-semibold text-[#FF6B00] hover:text-[#CC5500] underline underline-offset-2 transition-colors"
          >
            Rejoins BONMOMENT
          </a>
        </p>
      </footer>

    </main>
  )
}
