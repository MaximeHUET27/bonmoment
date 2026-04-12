import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { toSlug } from '@/lib/utils'
import UrgencyAndCTA from './UrgencyAndCTA'
import ShareButton from '@/app/components/ShareButton'
import FavoriButton from '@/app/components/FavoriButton'
import CommerceInfoCard from '@/app/components/CommerceInfoCard'
import { getFullOffreTitle } from '@/lib/offreTitle'

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
  const offreDesc  = `${getFullOffreTitle(offre)} à ${ville}. Réserve ton bon gratuit !`
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
  if (offre.type_remise === 'atelier')        return '🎉 Évènement'
  if (offre.type_remise === 'fidelite')       return '⭐ Fidélité'
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
      .select('*, commerces(id, nom, categorie, adresse, ville, description, photo_url, note_google, telephone, horaires)')
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
        <p className="text-[#3D3D3D] text-sm mb-6">Cette offre n&apos;existe pas ou a expiré.</p>
        <Link href="/" className="text-[#FF6B00] font-semibold underline underline-offset-2">
          ← Retour à l&apos;accueil
        </Link>
      </main>
    )
  }

  const commerce  = offre.commerces
  const villeSlug = commerce?.ville ? toSlug(commerce.ville) : null
  const expired   = offre.statut === 'expiree' || new Date(offre.date_fin) < new Date()

  return (
    <main className="min-h-screen bg-white flex flex-col">

      {/* ── Header ── */}
      <header className="w-full bg-white border-b border-[#EBEBEB] px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <Link href="/">
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
            className="bg-[#FF6B00] hover:bg-[#CC5500] text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors min-h-[44px] flex items-center whitespace-nowrap"
          >
            Retour
          </Link>
        </div>
      </header>

      {/* ── Corps ── */}
      <section className="flex-1 px-4 py-4 flex flex-col gap-4 max-w-lg mx-auto w-full">

        {/* 1. Badge remise — accroche visuelle forte */}
        <div className={`flex flex-col items-center justify-center rounded-3xl py-8 px-4 ${expired ? 'bg-[#F0F0F0]' : 'bg-[#FFF0E0]'}`}>
          <span className={`text-5xl sm:text-6xl font-black tracking-tight leading-none text-center ${expired ? 'text-[#B0B0B0]' : 'text-[#FF6B00]'}`}>
            {formatBadge(offre)}
          </span>
          {expired && (
            <span className="text-sm font-bold text-[#9CA3AF] mt-2">Trop tard !</span>
          )}
          {!expired && formatSubBadge(offre) && (
            <span className="text-xs font-semibold text-[#FF6B00]/70 mt-1.5 uppercase tracking-widest">
              {formatSubBadge(offre)}
            </span>
          )}
        </div>

        {/* 2. Titre */}
        <h1 className="text-xl sm:text-2xl font-black text-[#0A0A0A] text-center leading-tight px-2">
          {getFullOffreTitle(offre)}
        </h1>

        {/* 3. Barre d'urgence + CTA + preuve sociale — ABOVE THE FOLD */}
        <UrgencyAndCTA offre={offre} reservationsCount={reservationsCount ?? 0} />

        {/* ── Séparateur ── */}
        <div className="border-t border-[#F0F0F0] my-1" />

        {/* 4. Info commerce — secondaire */}
        <div className="flex flex-col gap-3">

          {/* Catégorie + favori */}
          <div className="flex items-center gap-3 flex-wrap">
            {commerce?.categorie && (
              <span className="text-[10px] font-semibold text-[#FF6B00] uppercase tracking-widest bg-[#FFF0E0] px-2 py-0.5 rounded-full">
                {commerce.categorie}
              </span>
            )}
            {commerce?.id && (
              <FavoriButton commerceId={commerce.id} commerceNom={commerce.nom || ''} className="!min-h-[28px] !min-w-[28px]" />
            )}
          </div>

          {/* Bloc unifié commerce — nom = lien cliquable vers /commercant/[id] */}
          <CommerceInfoCard commerce={commerce} commerceId={commerce?.id} />

          {/* Description */}
          {commerce?.description && (
            <p className="text-xs text-[#3D3D3D]/60 leading-relaxed">{commerce.description}</p>
          )}

        </div>

      </section>

    </main>
  )
}
