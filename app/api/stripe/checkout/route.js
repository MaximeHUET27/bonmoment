import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'
import { hashPlaceId } from '@/lib/essai/placeIdHash'

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
    .select('id, parrain_id, place_id, stripe_customer_id, stripe_subscription_id')
    .eq('id', commerce_id)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!commerce) {
    return Response.json({ error: 'Commerce introuvable' }, { status: 404 })
  }

  // ── Bypass Stripe pour les commerçants ambassadeurs ──────────────────────
  const { data: commerceFlags } = await supabaseAdmin
    .from('commerces')
    .select('est_ambassadeur')
    .eq('id', commerce_id)
    .single()

  if (commerceFlags?.est_ambassadeur) {
    await supabaseAdmin
      .from('commerces')
      .update({ palier, abonnement_actif: true, resiliation_prevue: false, date_fin_abonnement: null })
      .eq('id', commerce_id)
    const siteUrlAmb = process.env.NEXT_PUBLIC_SITE_URL || 'https://bonmoment.app'
    return Response.json({ url: `${siteUrlAmb}/commercant/dashboard?commerce=${commerce_id}` })
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
  // Stripe interdit de combiner trial_period_days + discounts dans subscription_data.
  // Quand isFirstSubscription, on stocke l'info dans les metadata et le webhook
  // invoice.created applique la remise (item négatif) avant la 1ère facture payante.
  const discountAmountsCents = { essentiel: 1000, pro: 1500 }
  const subscriptionDiscounts = []
  const filleulMeta = {}

  if (parrainIdEffectif) {
    const amountOff = discountAmountsCents[palier] ?? 1000
    if (isFirstSubscription) {
      filleulMeta.parrainage_filleul  = 'true'
      filleulMeta.parrainage_montant  = String(amountOff)
      filleulMeta.parrain_commerce_id = parrainIdEffectif
    } else {
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
  }

  const hasParrainage = filleulMeta.parrainage_filleul === 'true' || subscriptionDiscounts.length > 0
  const prixCentimes  = { essentiel: 2900, pro: 4900 }
  const amountOff     = discountAmountsCents[palier] ?? 1000

  // ── Vérification anti-abus du mois d'essai (côté serveur) ────────────────
  const serverFirstSubscription =
    !commerce.stripe_customer_id && !commerce.stripe_subscription_id
  const placeIdHash = commerce.place_id ? hashPlaceId(commerce.place_id) : null

  // Purge paresseuse des entrées expirées (non bloquante)
  try {
    await supabaseAdmin.from('essais_consommes')
      .delete().lt('expire_le', new Date().toISOString())
  } catch {}

  let dejaEssai = false
  if (placeIdHash) {
    try {
      const { data: ledger } = await supabaseAdmin
        .from('essais_consommes')
        .select('place_id_hash')
        .eq('place_id_hash', placeIdHash)
        .maybeSingle()
      dejaEssai = !!ledger
    } catch (e) {
      // FAIL-OPEN volontaire : si la lecture échoue on n'empêche pas le trial
      // (priorité = ne jamais bloquer un vrai nouveau commerçant ; risque = trial
      //  en trop dans un cas d'erreur rare, jugé acceptable)
      console.error('Lecture registre essai:', e.message)
    }
  }

  const trialEligible = serverFirstSubscription && !dejaEssai
  // ─────────────────────────────────────────────────────────────────────────

  try {
    const session = await stripe.checkout.sessions.create({
      mode:                 'subscription',
      payment_method_types: ['card'],
      line_items:           [{ price: priceId, quantity: 1 }],
      subscription_data: {
        ...(trialEligible ? { trial_period_days: 30 } : {}),
        ...(subscriptionDiscounts.length ? { discounts: subscriptionDiscounts } : {}),
        metadata: { commerce_id, palier, user_id: user.id, ...filleulMeta },
      },
      customer_email: user.email,
      metadata: {
        commerce_id,
        palier,
        user_id:        user.id,
        place_id_hash:  placeIdHash || '',
        trial_granted:  trialEligible ? 'true' : 'false',
      },
      success_url:    `${siteUrl}/commercant/abonnement/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:     `${siteUrl}/commercant/abonnement?commerce_id=${commerce_id}`,
      locale:         'fr',
      ...(hasParrainage ? {
        custom_text: {
          submit: {
            message: `🎉 Votre remise parrainage de ${amountOff / 100}€ sera automatiquement appliquée sur votre 1ère facture. Vous ne paierez que ${(prixCentimes[palier] - amountOff) / 100}€ au lieu de ${prixCentimes[palier] / 100}€.`,
          },
        },
      } : {}),
    })
    return Response.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout session:', err.message)
    return Response.json({ error: `Erreur Stripe : ${err.message}` }, { status: 500 })
  }
}
