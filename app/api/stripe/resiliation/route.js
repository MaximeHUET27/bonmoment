import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { commerce_id, action } = body

  if (!commerce_id || !action) {
    return Response.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  // Vérifie la propriété ET récupère l'ID subscription
  const { data: commerce } = await supabase
    .from('commerces')
    .select('stripe_subscription_id')
    .eq('id', commerce_id)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!commerce?.stripe_subscription_id) {
    return Response.json({ error: 'Abonnement Stripe introuvable' }, { status: 404 })
  }

  const subId = commerce.stripe_subscription_id

  /* ── Pause 1 mois ── */
  if (action === 'pause') {
    const resumesAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 // +30 jours

    await stripe.subscriptions.update(subId, {
      pause_collection: {
        behavior:   'void',    // les invoices pendant la pause sont voidées (non prélevées)
        resumes_at: resumesAt, // reprise automatique après 30 jours
      },
    })

    return Response.json({ ok: true, message: 'Abonnement mis en pause pour 1 mois' })
  }

  /* ── Résiliation fin de mois ── */
  if (action === 'resilier') {
    await stripe.subscriptions.update(subId, {
      cancel_at_period_end: true,
    })

    // Anticipation côté BDD — le webhook 'customer.subscription.deleted' confirmera
    await supabaseAdmin.from('commerces').update({
      abonnement_actif: false,
    }).eq('id', commerce_id)

    return Response.json({ ok: true, message: 'Résiliation programmée en fin de mois' })
  }

  return Response.json({ error: `Action invalide : "${action}"` }, { status: 400 })
}
