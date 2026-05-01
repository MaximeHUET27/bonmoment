import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  /* Auth — seul un utilisateur connecté peut déclencher cet upsert */
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const nom  = body.nom?.trim()
  if (!nom) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

  /* Récupère code INSEE + département + coordonnées via geo.api.gouv.fr */
  let code_insee  = null
  let departement = null
  let latitude    = null
  let longitude   = null
  try {
    const res  = await fetch(
      `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(nom)}&fields=code,codeDepartement,centre&boost=population&limit=1`,
      { signal: AbortSignal.timeout(4000) }
    )
    const data = await res.json()
    code_insee  = data[0]?.code                        ?? null
    departement = data[0]?.codeDepartement             ?? null
    // GeoJSON : centre.coordinates = [longitude, latitude]
    longitude   = data[0]?.centre?.coordinates?.[0]   ?? null
    latitude    = data[0]?.centre?.coordinates?.[1]   ?? null
  } catch {
    /* geo.api indisponible → sera null */
  }

  /* code_insee est NOT NULL en BDD — on ne peut pas insérer sans lui */
  if (!code_insee) {
    console.error('[upsert-ville] code_insee introuvable pour:', nom)
    return NextResponse.json({ error: 'code_insee introuvable' }, { status: 422 })
  }

  /* Vérifie si la ville existe déjà (case-insensitive) */
  const { data: existing } = await admin
    .from('villes')
    .select('id, active')
    .ilike('nom', nom)
    .maybeSingle()

  if (!existing) {
    /* Nouvelle ville → INSERT (on ignore si une course condition crée un doublon) */
    const { error } = await admin
      .from('villes')
      .insert({ nom, code_insee, departement, active: true, latitude, longitude })
    if (error && !error.message.includes('duplicate')) {
      console.error('[upsert-ville] insert error:', error.message)
    }
  } else if (!existing.active) {
    /* Ville existante mais inactive → activer */
    const { error } = await admin
      .from('villes')
      .update({ active: true })
      .eq('id', existing.id)
    if (error) {
      console.error('[upsert-ville] update error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }
  /* Sinon : déjà active → no-op */

  return NextResponse.json({ success: true })
}
