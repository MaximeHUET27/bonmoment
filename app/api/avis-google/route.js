import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const checkRate = rateLimit({ maxRequests: 10, windowMs: 5 * 60 * 1000 })

export async function POST(request) {
  const limited = checkRate(request)
  if (limited) return limited

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { reservation_id, commerce_id, note } = body

  if (!commerce_id || !note) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  if (!reservation_id) return NextResponse.json({ success: true })

  const { error } = await admin
    .from('avis_google_clics')
    .insert({ reservation_id, commerce_id, user_id: user.id, note })

  if (error) {
    console.error('[avis-google] insert error:', error.message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
