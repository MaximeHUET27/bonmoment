/**
 * POST /api/push/send
 * Route interne — appelée uniquement par les crons Vercel (CRON_SECRET).
 * Envoie une notification push à une liste de user_ids.
 *
 * Body JSON :
 *   { user_ids: string[], title: string, body: string, url?: string }
 */
import { createClient } from '@supabase/supabase-js'
import { sendPushToMany } from '@/lib/push'
import { NextResponse } from 'next/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

export async function POST(request) {
  /* Auth interne */
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { user_ids, title, body, url } = await request.json()
  if (!user_ids?.length || !title || !body) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', user_ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!subs?.length) return NextResponse.json({ envoyes: 0 })

  const envoyes = await sendPushToMany(subs, { title, body, url }, admin)
  return NextResponse.json({ envoyes, total: subs.length })
}
