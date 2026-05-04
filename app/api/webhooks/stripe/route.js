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
          palier:                 palier || 'essentiel',
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
        // Ignorer les factures à 0€ (trial, ou entièrement couvertes par un avoir)
        if (!invoice.amount_paid || invoice.amount_paid === 0) break

        // Cherche le commerce filleul via son stripe_subscription_id
        const { data: filleul } = await supabaseAdmin
          .from('commerces')
          .select('id, nom, parrain_id, parrainage_parrain_recompense, palier')
          .eq('stripe_subscription_id', invoice.subscription)
          .maybeSingle()

        // Ignore si pas de parrainage ou déjà traité (idempotent)
        if (!filleul?.parrain_id || filleul.parrainage_parrain_recompense) break

        // Récupère l'abonnement Stripe du parrain
        const { data: parrain } = await supabaseAdmin
          .from('commerces')
          .select('id, nom, stripe_subscription_id, owner_id')
          .eq('id', filleul.parrain_id)
          .maybeSingle()

        const discountAmountsCents = { essentiel: 1000, pro: 1500 }
        const amountOff = discountAmountsCents[filleul.palier] ?? 1000

        if (parrain?.stripe_subscription_id) {
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

        // Email Brevo au parrain (envoi uniquement lors du premier traitement — idempotence garantie ci-dessus)
        if (parrain?.owner_id) {
          try {
            const montant = amountOff / 100
            const { data: { user: parrainUser } } = await supabaseAdmin.auth.admin.getUserById(parrain.owner_id)
            if (parrainUser?.email) {
              await fetch('https://api.brevo.com/v3/smtp/email', {
                method:  'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'api-key':       process.env.BREVO_API_KEY,
                },
                body: JSON.stringify({
                  sender:      { name: 'BONMOMENT', email: 'bonmomentapp@gmail.com' },
                  to:          [{ email: parrainUser.email }],
                  subject:     `🎉 Nouveau filleul — ${montant}€ de remise sur votre prochaine mensualité !`,
                  htmlContent: buildEmailParrain({ parrainNom: parrain.nom, filleulNom: filleul.nom, montant }),
                }),
              })
            }
          } catch (emailErr) {
            console.error('Email parrain Brevo:', emailErr.message)
          }
        }

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

function buildEmailParrain({ parrainNom, filleulNom, montant }) {
  const siteUrl = 'https://bonmoment.app'
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F5F5F5;">

<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${filleulNom} a rejoint BONMOMENT — ${montant}€ de remise pour vous</div>

<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#F5F5F5" style="background:#F5F5F5;padding:20px 0;">
<tr><td align="center" style="padding:20px 16px;">

<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

  <tr><td style="background:#FF6B00;padding:32px 24px;text-align:center;">
    <span style="font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;color:#FFFFFF;letter-spacing:2px;">BONMOMENT</span>
    <div style="font-size:36px;line-height:1;margin:12px 0 8px;">🎉</div>
    <div style="font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;line-height:1.3;">Nouveau filleul — ${montant}€ de remise sur votre prochaine mensualité !</div>
  </td></tr>

  <tr><td style="padding:32px 28px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:15px;color:#3D3D3D;line-height:1.7;">
    <p style="margin:0 0 16px;">Bonjour,</p>
    <p style="margin:0 0 16px;">
      <strong>${filleulNom}</strong> vient de rejoindre BONMOMENT grâce à votre parrainage&nbsp;!
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF0E0;border-radius:10px;margin-bottom:24px;">
      <tr><td style="padding:20px 24px;text-align:center;">
        <p style="margin:0 0 4px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#CC5500;text-transform:uppercase;letter-spacing:1px;">Votre récompense</p>
        <p style="margin:0;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:32px;font-weight:900;color:#FF6B00;line-height:1;">${montant}€</p>
        <p style="margin:4px 0 0;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:13px;color:#3D3D3D;">de remise sur votre prochaine mensualité payante</p>
      </td></tr>
    </table>
    <p style="margin:0;font-size:14px;color:#3D3D3D;line-height:1.6;">
      Cette remise sera automatiquement appliquée sur votre prochaine facture BONMOMENT.
    </p>
  </td></tr>

  <tr><td style="padding:0 28px 32px;text-align:center;">
    <a href="${siteUrl}/commercant/dashboard"
       style="display:inline-block;background:#FF6B00;color:#FFFFFF;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;box-shadow:0 2px 4px rgba(255,107,0,0.3);">
      Voir mon tableau de bord →
    </a>
  </td></tr>

  <tr><td style="padding:0 28px;">
    <div style="border-top:1px solid #F0F0F0;"></div>
  </td></tr>

  <tr><td style="padding:20px 28px;text-align:center;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:12px;color:#999999;line-height:1.6;">
    L'équipe BONMOMENT<br>
    <a href="mailto:bonmomentapp@gmail.com" style="color:#999999;text-decoration:none;">bonmomentapp@gmail.com</a>
  </td></tr>

</table>
</td></tr>
</table>

</body>
</html>`
}
