import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import AuthButton from '@/app/components/AuthButton'
import HomeClient from '@/app/components/HomeClient'

export default async function Home() {
  const supabase = await createClient()
  const [
    { data: villes, error: villesError },
    { data: offres, error: offresError },
  ] = await Promise.all([
    supabase.from('villes').select('id, nom').eq('active', true).order('nom'),
    supabase
      .from('offres')
      .select('id, titre, type_remise, valeur, date_fin, nb_bons_restants, commerces(nom, ville, categorie)')
      .eq('statut', 'active')
      .gt('date_fin', new Date().toISOString())
      .gt('nb_bons_restants', 0),
  ])

  if (villesError) console.error('Erreur chargement villes:', villesError.message)
  if (offresError) console.error('Erreur chargement offres:', offresError.message)

  return (
    <main className="min-h-screen bg-white flex flex-col">

      {/* Barre auth en haut à droite */}
      <div className="fixed top-4 right-4 z-40 bg-white rounded-full shadow-sm">
        <AuthButton />
      </div>

      {/* Logo + tagline */}
      <div className="flex flex-col items-center px-6 pt-16 pb-6 text-center">
        <span className="inline-block mb-4 px-3 py-1.5 rounded-full bg-[#FFF0E0] text-[#FF6B00] text-[10px] sm:text-xs font-semibold tracking-wider uppercase">
          Pour vos commerçants, soyez là au
        </span>
        <Image
          src="/LOGO.png"
          alt="Logo BONMOMENT"
          width={900}
          height={450}
          priority
          unoptimized
          className="w-[220px] sm:w-[320px] h-auto"
        />
      </div>

      {/* Interface principale : bandeau ville, zone urgence, filtres, grille */}
      <HomeClient offres={offres || []} villes={villes || []} />

    </main>
  )
}
