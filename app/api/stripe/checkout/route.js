import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { palier, commerce_id, isFirstSubscription } = body

  const priceId = {
    decouverte: process.env.STRIPE_PRICE_DECOUVERTE,
    essentiel:  process.env.STRIPE_PRICE_ESSENTIEL,
    pro:        process.env.STRIPE_PRICE_PRO,
  }[palier]

  if (!priceId) {
    return Response.json(
      { error: !palier ? 'Palier manquant' : `Price ID manquant pour "${palier}" — configurez STRIPE_PRICE_${palier?.toUpperCase()} dans les variables d'env` },
      { status: 400 }
    )
  }

  if (!commerce_id) {
    return Response.json({ error: 'commerce_id manquant' }, { status: 400 })
  }

  // Vérifie que le commerce appartient bien à cet utilisateur
  const { data: commerce } = await supabase
    .from('commerces')
    .select('id')
    .eq('id', commerce_id)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!commerce) {
    return Response.json({ error: 'Commerce introuvable' }, { status: 404 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bonmoment.app'

  const session = await stripe.checkout.sessions.create({
    mode:                 'subscription',
    payment_method_types: ['card'],
    line_items:           [{ price: priceId, quantity: 1 }],
    subscription_data: {
      ...(isFirstSubscription ? { trial_period_days: 30 } : {}),
      metadata: { commerce_id, palier, user_id: user.id },
    },
    customer_email: user.email,
    metadata:       { commerce_id, palier, user_id: user.id },
    success_url:    `${siteUrl}/commercant/abonnement/succes?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:     `${siteUrl}/commercant/abonnement?commerce_id=${commerce_id}`,
    locale:         'fr',
  })

  return Response.json({ url: session.url })
}
