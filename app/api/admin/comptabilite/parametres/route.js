import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'bonmomentapp@gmail.com'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (user.email !== ADMIN_EMAIL)
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { data, error } = await admin
    .from('parametres_comptables')
    .select('*')
    .limit(1)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'private, max-age=300' },
  })
}

export async function PUT(request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (user.email !== ADMIN_EMAIL)
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const body = await request.json()
  const { regime, periodicite_tva, ec_nom, ec_email, ec_tel, siret, num_tva, date_cloture, seuil_micro, seuil_franchise_tva } = body

  // Récupérer l'id existant
  const { data: existing } = await admin.from('parametres_comptables').select('id').limit(1).single()
  if (!existing) return NextResponse.json({ error: 'Paramètres introuvables' }, { status: 404 })

  const updates = {}
  if (regime !== undefined) updates.regime = regime
  if (periodicite_tva !== undefined) updates.periodicite_tva = periodicite_tva
  if (ec_nom !== undefined) updates.ec_nom = ec_nom
  if (ec_email !== undefined) updates.ec_email = ec_email
  if (ec_tel !== undefined) updates.ec_tel = ec_tel
  if (siret !== undefined) updates.siret = siret
  if (num_tva !== undefined) updates.num_tva = num_tva
  if (date_cloture !== undefined) updates.date_cloture = date_cloture
  if (seuil_micro !== undefined) updates.seuil_micro = seuil_micro
  if (seuil_franchise_tva !== undefined) updates.seuil_franchise_tva = seuil_franchise_tva

  const { data, error } = await admin
    .from('parametres_comptables')
    .update(updates)
    .eq('id', existing.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
