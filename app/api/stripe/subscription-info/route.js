/**
 * GET /api/stripe/subscription-info?subscription_id=sub_xxx
 * Retourne les infos de renouvellement d'un abonnement Stripe.
 * Vérifie que l'abonnement appartient bien à un commerce du user connecté.
 */
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const subscriptionId = searchParams.get('subscription_id')
  if (!subscriptionId) return NextResponse.json({ error: 'subscription_id manquant' }, { status: 400 })

  /* Vérifie que ce subscription_id appartient à un commerce du user */
  const { data: commerce } = await admin
    .from('commerces')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!commerce) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const sub = await stripe.subscriptions.retrieve(subscriptionId)

  return NextResponse.json({
    current_period_end:  sub.current_period_end,   // timestamp UNIX (secondes)
    cancel_at_period_end: sub.cancel_at_period_end, // boolean
    status:              sub.status,
  })
}
