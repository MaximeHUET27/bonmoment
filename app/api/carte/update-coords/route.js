import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  /* Auth */
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { id, latitude, longitude } = body

  if (!id || latitude == null || longitude == null)
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })

  /* Validation coordonnées */
  if (typeof latitude !== 'number' || latitude < -90 || latitude > 90 ||
      typeof longitude !== 'number' || longitude < -180 || longitude > 180)
    return NextResponse.json({ error: 'Coordonnées invalides' }, { status: 400 })

  /* Vérification ownership */
  const { data: commerce } = await admin
    .from('commerces')
    .select('id')
    .eq('id', id)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!commerce) return NextResponse.json({ error: 'Commerce introuvable' }, { status: 403 })

  const { error } = await admin
    .from('commerces')
    .update({ latitude, longitude })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
