import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { toSlug } from '@/lib/utils'
import UrgencyAndCTA from './UrgencyAndCTA'
import ShareButton from '@/app/components/ShareButton'

const OG_DEFAULT_IMAGE = 'https://bonmoment.app/og-default.jpg'

/* ── Open Graph metadata ─────────────────────────────────────────────────── */

export async function generateMetadata({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: offre } = await supabase
    .from('offres')
    .select('type_remise, valeur, titre, commerces(nom, ville, photo_url)')
    .eq('id', id)
    .single()

  if (!offre) return {}

  const badge = formatBadge(offre)
  const nom   = offre.commerces?.nom   || 'Commerce'
  const ville = offre.commerces?.ville || ''
  const image = offre.commerces?.photo_url || OG_DEFAULT_IMAGE
  const offreTitle = `${badge} chez ${nom} — BONMOMENT`
  const offreDesc  = `${offre.titre} à ${ville}. Réserve ton bon gratuit !`
  const offreUrl   = `https://bonmoment.app/offre/${id}`

  return {
    title:       offreTitle,
    description: offreDesc,
    openGraph: {
      title:       offreTitle,
      description: offreDesc,
      url:         offreUrl,
      siteName:    'BONMOMENT',
      images:      [{ url: image, width: 1200, height: 630, alt: offreTitle }],
      type:        'website',
    },
    twitter: {
      card:        'summary_large_image',
      title:       offreTitle,
      description: offreDesc,
      images:      [image],
    },
  }
}

function formatBadge(offre) {
  if (offre.type_remise === 'pourcentage')    return `−${offre.valeur}%`
  if (offre.type_remise === 'montant_fixe')   return `−${offre.valeur}€`
  if (offre.type_remise === 'montant')        return `−${offre.valeur}€`   // rétrocompat
  if (offre.type_remise === 'cadeau')         return '🎁 Cadeau'
  if (offre.type_remise === 'produit_offert') return '📦 Offert'
  if (offre.type_remise === 'service_offert') return '✂️ Offert'
  if (offre.type_remise === 'offert')         return 'Offert'               // rétrocompat
  if (offre.type_remise === 'concours')       return '🎰 Concours'
  if (offre.type_remise === 'atelier')        return '🎨 Atelier'
  return offre.type_remise || 'Offre'
}

function formatSubBadge(offre) {
  if (offre.type_remise === 'pourcentage') return 'de remise'
  if (offre.type_remise === 'montant_fixe' || offre.type_remise === 'montant') return 'offerts'
  return null
}

export default async function OffrePage({ params }) {
  const { id } = await params
  const supabase = await createClient()

  /* ── Données offre ── */
  const [{ data: offre }, { count: reservationsCount }] = await Promise.all([
    supabase
      .from('offres')
      .select('*, commerces(nom, categorie, adresse, ville, description, photo_url)')
      .eq('id', id)
      .single(),
    supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('offre_id', id)
      .eq('statut', 'reservee'),
  ])

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

  const commerce  = offre.commerces
  const villeSlug = commerce?.ville ? toSlug(commerce.ville) : null
  const mapsUrl   = commerce?.adresse
    ? `https://maps.google.com/?q=${encodeURIComponent(`${commerce.adresse}, ${commerce.ville || ''}`)}`
    : null

  return (
    <main className="min-h-screen bg-white flex flex-col">

      {/* ── Header ── */}
      <header className="px-4 pt-5 pb-2 flex items-center justify-between">
        <Link href={villeSlug ? `/ville/${villeSlug}` : '/'}>
          <Image
            src="/LOGO.png"
            alt="BONMOMENT"
            width={600}
            height={300}
            unoptimized
            priority
            className="w-[100px] h-auto"
          />
        </Link>
        <div className="flex items-center gap-2">
          <ShareButton offre={offre} commerce={commerce} />
          <Link
            href={villeSlug ? `/ville/${villeSlug}` : '/'}
            className="text-xs font-semibold text-[#3D3D3D]/60 hover:text-[#FF6B00] transition-colors"
          >
            ← Tous les bons plans
          </Link>
        </div>
      </header>

      {/* ── Corps ── */}
      <section className="flex-1 px-4 py-4 flex flex-col gap-4 max-w-lg mx-auto w-full">

        {/* 1. Badge remise — accroche visuelle forte */}
        <div className="flex flex-col items-center justify-center bg-[#FFF0E0] rounded-3xl py-8 px-4">
          <span className="text-5xl sm:text-6xl font-black text-[#FF6B00] tracking-tight leading-none text-center">
            {formatBadge(offre)}
          </span>
          {formatSubBadge(offre) && (
            <span className="text-xs font-semibold text-[#FF6B00]/70 mt-1.5 uppercase tracking-widest">
              {formatSubBadge(offre)}
            </span>
          )}
        </div>

        {/* 2. Titre */}
        <h1 className="text-xl sm:text-2xl font-black text-[#0A0A0A] text-center leading-tight px-2">
          {offre.titre}
        </h1>

        {/* 3. Barre d'urgence + CTA + preuve sociale — ABOVE THE FOLD */}
        <UrgencyAndCTA offre={offre} reservationsCount={reservationsCount ?? 0} />

        {/* ── Séparateur ── */}
        <div className="border-t border-[#F0F0F0] my-1" />

        {/* 4. Info commerce — secondaire */}
        <div className="flex flex-col gap-3">

          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#FFF0E0] flex items-center justify-center text-2xl shrink-0">
              🏪
            </div>
            <div>
              <Link
                href={`/commercant/${/* id inconnu ici → utilise le nom */''}`}
                className="text-base font-black text-[#0A0A0A] hover:text-[#FF6B00] transition-colors"
              >
                {commerce?.nom}
              </Link>
              {commerce?.categorie && (
                <div className="mt-1">
                  <span className="text-[10px] font-semibold text-[#FF6B00] uppercase tracking-widest bg-[#FFF0E0] px-2 py-0.5 rounded-full">
                    {commerce.categorie}
                  </span>
                </div>
              )}
              {commerce?.description && (
                <p className="text-xs text-[#3D3D3D]/60 mt-1 leading-relaxed">{commerce.description}</p>
              )}
            </div>
          </div>

          {/* Adresse */}
          {commerce?.adresse && (
            <p className="text-sm text-[#3D3D3D] flex items-start gap-1.5">
              <span className="mt-0.5 shrink-0">📍</span>
              <span>{commerce.adresse}{commerce.ville ? `, ${commerce.ville}` : ''}</span>
            </p>
          )}

          {/* Bouton S'y rendre */}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 border-2 border-[#FF6B00] text-[#FF6B00] font-bold text-sm py-3 rounded-2xl hover:bg-[#FFF0E0] transition-colors min-h-[48px]"
            >
              📍 S'y rendre
            </a>
          )}

        </div>

      </section>

    </main>
  )
}
