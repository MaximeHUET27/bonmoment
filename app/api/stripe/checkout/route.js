import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const checkRate = rateLimit({ maxRequests: 5, windowMs: 60 * 1000 })

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const limited = checkRate(request)
  if (limited) return limited

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { palier, commerce_id, isFirstSubscription, code_parrainage, parrain_commerce_id } = body

  const priceId = {
    essentiel: process.env.STRIPE_PRICE_ESSENTIEL,
    pro:       process.env.STRIPE_PRICE_PRO,
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

  // ── Validation et application du code parrainage (re-validation serveur) ──
  let parrainIdEffectif = commerce.parrain_id

  if (code_parrainage && parrain_commerce_id && isFirstSubscription) {
    const codeUpper = code_parrainage.trim().toUpperCase()
    let codeValide  = false

    do {
      const { data: codeRow } = await supabaseAdmin
        .from('codes_parrainage')
        .select('id, statut, expire_at, commerce_id')
        .eq('code', codeUpper)
        .eq('statut', 'actif')
        .maybeSingle()

      if (!codeRow) break
      if (new Date(codeRow.expire_at) <= new Date()) break
      if (codeRow.commerce_id === commerce_id) break
      if (codeRow.commerce_id !== parrain_commerce_id) break

      // Anti-auto-parrainage: vérifier que le parrain n'appartient pas au même utilisateur
      const { data: parrainCom } = await supabaseAdmin
        .from('commerces')
        .select('id, nom, abonnement_actif, owner_id')
        .eq('id', codeRow.commerce_id)
        .maybeSingle()

      if (!parrainCom) break
      if (parrainCom.owner_id === user.id) break
      if (!parrainCom.abonnement_actif) break

      // Limite 3 parrainages ce mois calendaire
      const debutMois = new Date()
      debutMois.setDate(1)
      debutMois.setHours(0, 0, 0, 0)
      const { count } = await supabaseAdmin
        .from('codes_parrainage')
        .select('id', { count: 'exact', head: true })
        .eq('commerce_id', codeRow.commerce_id)
        .eq('statut', 'utilise')
        .gte('utilise_at', debutMois.toISOString())

      if ((count ?? 0) >= 3) break

      // Code valide — mettre à jour parrain_id et marquer le code comme utilisé
      await supabaseAdmin
        .from('commerces')
        .update({ parrain_id: parrain_commerce_id })
        .eq('id', commerce_id)

      await supabaseAdmin
        .from('codes_parrainage')
        .update({
          statut:      'utilise',
          utilise_par: commerce_id,
          utilise_at:  new Date().toISOString(),
        })
        .eq('id', codeRow.id)

      parrainIdEffectif = parrain_commerce_id
      codeValide = true
    } while (false)

    if (!codeValide) {
      // Code fourni mais invalide — on continue sans coupon
      parrainIdEffectif = commerce.parrain_id
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bonmoment.app'

  // ── Coupon parrainage filleul ─────────────────────────────────────────────
  // S'applique à la première facture payante (après la période d'essai)
  const subscriptionDiscounts = []
  if (parrainIdEffectif && isFirstSubscription) {
    const discountAmountsCents = { essentiel: 1000, pro: 1500 }
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
