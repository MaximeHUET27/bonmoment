/**
 * POST /api/push/subscribe
 * Enregistre ou met à jour l'abonnement push du user connecté.
 * Appelée côté client après navigator.serviceWorker + pushManager.subscribe().
 *
 * Body JSON : { endpoint: string, keys: { p256dh: string, auth: string } }
 */
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

export async function POST(request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const { endpoint, keys } = await request.json()
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  /* Upsert dans push_subscriptions (une ligne par appareil) */
  const { error } = await admin.from('push_subscriptions').upsert(
    { user_id: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    { onConflict: 'user_id,endpoint' },
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  /* Marque le flag notifications_push dans la table users */
  await admin.from('users').update({ notifications_push: true }).eq('id', user.id)

  return NextResponse.json({ ok: true })
}
