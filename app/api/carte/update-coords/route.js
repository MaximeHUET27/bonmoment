import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const { id, latitude, longitude } = await request.json()
  if (!id || latitude == null || longitude == null)
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })

  const { error } = await admin
    .from('commerces')
    .update({ latitude, longitude })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
