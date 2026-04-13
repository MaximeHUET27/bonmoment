import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getFullOffreTitle } from '@/lib/offreTitle'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const OFFRES_SELECT = 'id, titre, type_remise, valeur, date_fin, statut, nb_bons_restants'
const COMMERCE_BASE = 'id, nom, photo_url, note_google, categorie_bonmoment, latitude, longitude, place_id'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const ville = searchParams.get('ville')
  if (!ville) return NextResponse.json({ error: 'ville manquant' }, { status: 400 })

  const now = new Date().toISOString()

  const { data: commerces, error } = await admin
    .from('commerces')
    .select(`${COMMERCE_BASE}, offres (${OFFRES_SELECT})`)
    .eq('ville', ville)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = (commerces || []).map(c => {
    const offresActives = (c.offres || []).filter(o =>
      o.statut === 'active' &&
      o.date_fin > now &&
      o.nb_bons_restants !== 0
    ).sort((a, b) => new Date(a.date_fin) - new Date(b.date_fin))

    const offreActive = offresActives[0] ?? null

    return {
      id:                  c.id,
      nom:                 c.nom,
      photo_url:           c.photo_url,
      note_google:         c.note_google,
      categorie_bonmoment: c.categorie_bonmoment,
      latitude:            c.latitude,
      longitude:           c.longitude,
      place_id:            c.place_id,
      offre_active: offreActive ? {
        id:       offreActive.id,
        titre:    getFullOffreTitle(offreActive),
        date_fin: offreActive.date_fin,
      } : null,
    }
  })

  return NextResponse.json(result)
}
