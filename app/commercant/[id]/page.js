import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { toSlug } from '@/lib/utils'
import OffreCard from '@/app/ville/[slug]/OffreCard'
import CommerceInfoCard from '@/app/components/CommerceInfoCard'

export default async function CommercantPage({ params }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: commerce }, { data: offres }] = await Promise.all([
    supabase.from('commerces').select('id, nom, categorie, adresse, ville, description, photo_url, note_google, horaires, telephone, abonnement_actif, place_id').eq('id', id).single(),
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
          ← Retour à l&apos;accueil
        </Link>
      </main>
    )
  }

  const villeSlug = commerce.ville ? toSlug(commerce.ville) : null

  return (
    <main className="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <header className="w-full bg-white border-b border-[#EBEBEB] px-5 py-3 flex items-center justify-between sticky top-0 z-30">
        <Link href="/">
          <Image
            src="/LOGO.png"
            alt="Logo BONMOMENT"
            width={600}
            height={300}
            unoptimized
            priority
            className="w-[110px] h-auto"
          />
        </Link>
        <Link href={villeSlug ? `/ville/${villeSlug}` : '/'} className="bg-[#FF6B00] hover:bg-[#CC5500] text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors min-h-[44px] flex items-center whitespace-nowrap">
          {villeSlug ? `Bons à ${commerce.ville}` : 'Accueil'}
        </Link>
      </header>

      {/* Fiche commerce */}
      <section className="px-4 pt-8 pb-4 w-full max-w-lg mx-auto">

        {/* Catégorie */}
        <p className="text-xs font-semibold text-[#FF6B00] uppercase tracking-widest mb-3">
          {commerce.categorie}
        </p>

        {/* Carte infos commerce */}
        <CommerceInfoCard commerce={commerce} commerceId={commerce.id} placeId={commerce.place_id ?? null} />

        {commerce.description && (
          <p className="text-sm text-[#3D3D3D] leading-relaxed mt-4 mb-2">{commerce.description}</p>
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


    </main>
  )
}
