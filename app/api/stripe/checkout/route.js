import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const checkRate = rateLimit({ maxRequests: 5, windowMs: 60 * 1000 })

export async function POST(request) {
  const limited = checkRate(request)
  if (limited) return limited

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
    .select('id, parrain_id')
    .eq('id', commerce_id)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!commerce) {
    return Response.json({ error: 'Commerce introuvable' }, { status: 404 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bonmoment.app'

  // ── Coupon parrainage filleul ─────────────────────────────────────────────
  // S'applique à la première facture payante (après la période d'essai)
  const subscriptionDiscounts = []
  if (commerce.parrain_id && isFirstSubscription) {
    const discountAmountsCents = { decouverte: 1000, essentiel: 1500, pro: 2000 }
    const amountOff = discountAmountsCents[palier] ?? 1000
    try {
      const coupon = await stripe.coupons.create({
        amount_off: amountOff,
        currency:   'eur',
        duration:   'once',
        name:       `Parrainage filleul — ${palier}`,
      })
      subscriptionDiscounts.push({ coupon: coupon.id })
    } catch (err) {
      console.error('Création coupon filleul:', err.message)
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode:                 'subscription',
    payment_method_types: ['card'],
    line_items:           [{ price: priceId, quantity: 1 }],
    subscription_data: {
      ...(isFirstSubscription ? { trial_period_days: 30 } : {}),
      ...(subscriptionDiscounts.length ? { discounts: subscriptionDiscounts } : {}),
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
