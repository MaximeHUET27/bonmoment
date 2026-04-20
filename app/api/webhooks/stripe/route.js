import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic  = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const body = await request.text()
  const sig  = request.headers.get('stripe-signature')

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET non configuré')
    return Response.json({ error: 'Webhook secret manquant' }, { status: 500 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Stripe webhook signature invalide:', err.message)
    return Response.json({ error: 'Signature invalide' }, { status: 400 })
  }

  try {
    switch (event.type) {

      /* ── Paiement initié + trial démarré ── */
      case 'checkout.session.completed': {
        const session = event.data.object
        const { commerce_id, palier } = session.metadata || {}
        if (!commerce_id) break

        await supabaseAdmin.from('commerces').update({
          abonnement_actif:       true,
          palier:                 palier || 'decouverte',
          stripe_customer_id:     session.customer,
          stripe_subscription_id: session.subscription,
          resiliation_prevue:     false,
          date_fin_abonnement:    null,
        }).eq('id', commerce_id)
        break
      }

      /* ── Mise à jour subscription (pause, reprise, cancel_at_period_end, changement palier) ── */
      case 'customer.subscription.updated': {
        const sub         = event.data.object
        const commerce_id = sub.metadata?.commerce_id
        if (!commerce_id) break

        const updates = {
          abonnement_actif: sub.status === 'active' || sub.status === 'trialing',
        }

        if (sub.metadata?.palier) updates.palier = sub.metadata.palier

        if (sub.cancel_at_period_end) {
          // Résiliation programmée — l'abonnement reste actif jusqu'à la fin de période
          // Ne pas toucher à abonnement_actif ici (peut encore être actif/trialing)
          updates.resiliation_prevue  = true
          updates.date_fin_abonnement = new Date(sub.current_period_end * 1000).toISOString()
        } else {
          // Résiliation annulée ou abonnement repris normalement
          updates.resiliation_prevue  = false
          updates.date_fin_abonnement = null
        }

        await supabaseAdmin.from('commerces').update(updates).eq('id', commerce_id)
        break
      }

      /* ── Résiliation effective — la période est vraiment terminée ── */
      case 'customer.subscription.deleted': {
        const sub         = event.data.object
        const commerce_id = sub.metadata?.commerce_id
        if (!commerce_id) break

        await supabaseAdmin.from('commerces').update({
          abonnement_actif:       false,
          palier:                 null,
          stripe_subscription_id: null,
          resiliation_prevue:     false,
          date_fin_abonnement:    null,
        }).eq('id', commerce_id)
        break
      }

      /* ── Premier paiement filleul → récompense le parrain ── */
      case 'invoice.paid': {
        const invoice = event.data.object
        // On ne traite que les factures d'abonnement (pas les one-time)
        if (!invoice.subscription) break

        // Cherche le commerce filleul via son stripe_subscription_id
        const { data: filleul } = await supabaseAdmin
          .from('commerces')
          .select('id, parrain_id, parrainage_parrain_recompense, palier')
          .eq('stripe_subscription_id', invoice.subscription)
          .maybeSingle()

        // Ignore si pas de parrainage ou déjà traité (idempotent)
        if (!filleul?.parrain_id || filleul.parrainage_parrain_recompense) break

        // Récupère l'abonnement Stripe du parrain
        const { data: parrain } = await supabaseAdmin
          .from('commerces')
          .select('id, stripe_subscription_id')
          .eq('id', filleul.parrain_id)
          .maybeSingle()

        if (parrain?.stripe_subscription_id) {
          const discountAmountsCents = { decouverte: 1000, essentiel: 1500, pro: 2000 }
          const amountOff = discountAmountsCents[filleul.palier] ?? 1000
          try {
            const coupon = await stripe.coupons.create({
              amount_off: amountOff,
              currency:   'eur',
              duration:   'once',
              name:       `Parrainage parrain — filleul ${filleul.palier}`,
            })
            await stripe.subscriptions.update(parrain.stripe_subscription_id, {
              discounts: [{ coupon: coupon.id }],
            })
          } catch (err) {
            console.error('Coupon parrain:', err.message)
            // On marque quand même pour éviter les doubles tentatives
          }
        }

        // Marque le parrainage parrain comme traité
        await supabaseAdmin
          .from('commerces')
          .update({ parrainage_parrain_recompense: true })
          .eq('id', filleul.id)
        break
      }

      /* ── Échec de paiement ── */
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        console.warn('Paiement échoué — customer:', invoice.customer, '— invoice:', invoice.id)
        // TODO: envoyer email de relance via Brevo
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('Webhook handler error sur', event.type, ':', err)
    return Response.json({ error: 'Erreur interne webhook' }, { status: 500 })
  }

  return Response.json({ received: true })
}
