import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request, { params }) {
  const { id } = await params

  const { data, error } = await admin
    .from('reservations')
    .select('statut')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  return NextResponse.json({ statut: data.statut })
}
