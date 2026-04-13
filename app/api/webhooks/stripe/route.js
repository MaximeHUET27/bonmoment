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
        const session    = event.data.object
        const { commerce_id, palier } = session.metadata || {}
        if (!commerce_id) break

        await supabaseAdmin.from('commerces').update({
          abonnement_actif:       true,
          palier:                 palier || 'decouverte',
          stripe_customer_id:     session.customer,
          stripe_subscription_id: session.subscription,
        }).eq('id', commerce_id)
        break
      }

      /* ── Mise à jour subscription (pause, reprise, changement palier) ── */
      case 'customer.subscription.updated': {
        const sub         = event.data.object
        const commerce_id = sub.metadata?.commerce_id
        if (!commerce_id) break

        const updates = {
          abonnement_actif: sub.status === 'active' || sub.status === 'trialing',
        }
        if (sub.metadata?.palier) updates.palier = sub.metadata.palier

        await supabaseAdmin.from('commerces').update(updates).eq('id', commerce_id)
        break
      }

      /* ── Résiliation confirmée ── */
      case 'customer.subscription.deleted': {
        const sub         = event.data.object
        const commerce_id = sub.metadata?.commerce_id
        if (!commerce_id) break

        await supabaseAdmin.from('commerces').update({
          abonnement_actif:       false,
          stripe_subscription_id: null,
        }).eq('id', commerce_id)
        break
      }

      /* ── Échec de paiement ── */
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        console.warn('Paiement échoué — customer:', invoice.customer, '— invoice:', invoice.id)
        // TODO: envoyer email de relance via Brevo (suspension après 7 jours gérée par Stripe smart retries)
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
