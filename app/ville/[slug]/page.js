import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { toSlug } from '@/lib/utils'
import AuthButton from '@/app/components/AuthButton'
import VilleClient from './VilleClient'

export default async function VillePage({ params }) {
  const { slug } = await params
  const supabase = await createClient()

  /* ── Résolution de la ville depuis son slug ── */
  const { data: villes } = await supabase
    .from('villes')
    .select('id, nom, photo_url, latitude, longitude')
    .eq('active', true)

  const ville = villes?.find(v => toSlug(v.nom) === slug)

  if (!ville) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl mb-4">😕</p>
        <p className="text-[#0A0A0A] font-bold text-lg mb-2">Ville introuvable</p>
        <p className="text-[#3D3D3D] text-sm mb-6">
          Cette ville n&apos;est pas encore disponible sur BONMOMENT.
        </p>
        <Link href="/" className="text-[#FF6B00] font-semibold underline underline-offset-2">
          ← Retour à l&apos;accueil
        </Link>
      </main>
    )
  }

  /* ── Fetch parallèle : offres + stats ── */
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const [
    { data: offres },
    { count: nbAbonnes },
    { count: nbCommerces },
  ] = await Promise.all([
    supabase
      .from('offres')
      .select(`
        *,
        commerces!inner (
          id,
          nom,
          categorie,
          categorie_bonmoment,
          adresse,
          ville,
          photo_url,
          note_google,
          telephone,
          horaires,
          abonnement_actif
        )
      `)
      .eq('commerces.ville', ville.nom)
      .order('date_fin', { ascending: true }),
    admin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .contains('villes_abonnees', [ville.nom]),
    admin
      .from('commerces')
      .select('*', { count: 'exact', head: true })
      .eq('ville', ville.nom)
      .eq('abonnement_actif', true),
  ])

  /* Nombre d'offres actives (statut + date + bons restants) */
  const now = new Date().toISOString()
  const nbOffresActives = (offres || []).filter(o =>
    o.statut === 'active' && o.date_fin > now && o.nb_bons_restants !== 0 &&
    o.commerces?.abonnement_actif === true
  ).length

  return (
    <main className="min-h-screen bg-white flex flex-col">

      {/* ── Header sticky ── */}
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

      {/* ── Interface interactive ── */}
      <VilleClient
        offres={offres || []}
        villeNom={ville.nom}
        villePhotoUrl={ville.photo_url || null}
        villeLat={ville.latitude || null}
        villeLng={ville.longitude || null}
        nbOffresActives={nbOffresActives}
        nbAbonnes={nbAbonnes || 0}
        nbCommerces={nbCommerces || 0}
        villes={villes || []}
      />

    </main>
  )
}
