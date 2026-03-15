import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { toSlug } from '@/lib/utils'
import UrgencyAndCTA from './UrgencyAndCTA'

function formatBadge(offre) {
  if (offre.type_remise === 'pourcentage') return `−${offre.valeur}%`
  if (offre.type_remise === 'montant') return `−${offre.valeur}€`
  if (offre.type_remise === 'offert') return 'Offert'
  return offre.type_remise || 'Offre'
}

export default async function OffrePage({ params }) {
  const { id } = await params

  const { data: offre } = await supabase
    .from('offres')
    .select('*, commerces(nom, categorie, ville, adresse, description, photo_url)')
    .eq('id', id)
    .single()

  if (!offre) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl mb-4">😕</p>
        <p className="text-[#0A0A0A] font-bold text-lg mb-2">Offre introuvable</p>
        <p className="text-[#3D3D3D] text-sm mb-6">Cette offre n'existe pas ou a expiré.</p>
        <Link href="/" className="text-[#FF6B00] font-semibold underline underline-offset-2">
          ← Retour à l'accueil
        </Link>
      </main>
    )
  }

  const commerce = offre.commerces
  const villeSlug = commerce?.ville ? toSlug(commerce.ville) : null
  const mapsUrl = commerce?.adresse
    ? `https://maps.google.com/?q=${encodeURIComponent(`${commerce.adresse}, ${commerce.ville || ''}`)}`
    : null

  return (
    <main className="min-h-screen bg-white flex flex-col">

      {/* Header — logo petit */}
      <header className="px-4 pt-6 pb-2 flex items-center justify-between">
        <Link href={villeSlug ? `/ville/${villeSlug}` : '/'}>
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
        <Link
          href={villeSlug ? `/ville/${villeSlug}` : '/'}
          className="text-xs font-semibold text-[#3D3D3D]/60 hover:text-[#FF6B00] transition-colors"
        >
          ← Tous les bons plans
        </Link>
      </header>

      {/* Corps principal */}
      <section className="flex-1 px-4 py-6 flex flex-col gap-4 max-w-lg mx-auto w-full">

        {/* 2. Badge remise — accroche visuelle forte */}
        <div className="flex flex-col items-center justify-center bg-[#FFF0E0] rounded-3xl py-8 px-4">
          <span className="text-6xl font-black text-[#FF6B00] tracking-tight leading-none">
            {formatBadge(offre)}
          </span>
          {offre.type_remise === 'pourcentage' && (
            <span className="text-xs font-semibold text-[#FF6B00]/70 mt-1 uppercase tracking-widest">de remise</span>
          )}
          {offre.type_remise === 'montant' && (
            <span className="text-xs font-semibold text-[#FF6B00]/70 mt-1 uppercase tracking-widest">offerts</span>
          )}
        </div>

        {/* 3. Titre — contexte de l'offre */}
        <h1 className="text-2xl font-black text-[#0A0A0A] text-center leading-tight px-2">
          {offre.titre}
        </h1>

        {/* 4. Barre d'urgence + CTA + preuve sociale */}
        <UrgencyAndCTA offre={offre} />

        {/* Séparateur */}
        <div className="border-t border-[#F0F0F0] my-2" />

        {/* 7. Info commerce — en bas, secondaire */}
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#FFF0E0] flex items-center justify-center text-2xl shrink-0">
              🏪
            </div>
            <div>
              <p className="text-base font-black text-[#0A0A0A]">{commerce?.nom}</p>
              {commerce?.categorie && (
                <span className="text-[10px] font-semibold text-[#FF6B00] uppercase tracking-widest bg-[#FFF0E0] px-2 py-0.5 rounded-full">
                  {commerce.categorie}
                </span>
              )}
            </div>
          </div>

          {commerce?.adresse && (
            <p className="text-sm text-[#3D3D3D] flex items-start gap-1.5">
              <span className="mt-0.5">📍</span>
              <span>{commerce.adresse}{commerce.ville ? `, ${commerce.ville}` : ''}</span>
            </p>
          )}

          {/* Bouton S'y rendre */}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 border-2 border-[#FF6B00] text-[#FF6B00] font-bold text-sm py-3 rounded-2xl hover:bg-[#FFF0E0] transition-colors"
            >
              <span>🗺</span>
              S'y rendre
            </a>
          )}
        </div>

      </section>

    </main>
  )
}
