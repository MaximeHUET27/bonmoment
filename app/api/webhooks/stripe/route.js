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

        if (session.metadata?.trial_granted === 'true' && session.metadata?.place_id_hash) {
          const expire = new Date()
          expire.setMonth(expire.getMonth() + 24)
          try {
            await supabaseAdmin.from('essais_consommes').upsert(
              {
                place_id_hash: session.metadata.place_id_hash,
                consomme_le:   new Date().toISOString(),
                expire_le:     expire.toISOString(),
              },
              { onConflict: 'place_id_hash', ignoreDuplicates: true }
            )
          } catch (e) {
            console.error('Écriture registre essai:', e.message)
          }
        }

        // Ex-ambassadeur : pousser la cagnotte bancarisée sur le nouveau solde Stripe
        try {
          const { data: c } = await supabaseAdmin
            .from('commerces').select('cagnotte_parrainage_cents')
            .eq('id', commerce_id).maybeSingle()
          const cents = c?.cagnotte_parrainage_cents || 0
          if (cents > 0 && session.customer) {
            await stripe.customers.createBalanceTransaction(
              session.customer,
              { amount: -cents, currency: 'eur', description: 'Cagnotte parrainage (cumul ambassadeur)' },
              { idempotencyKey: `cagnotte-conv-${commerce_id}` }
            )
            await supabaseAdmin.from('commerces')
              .update({ cagnotte_parrainage_cents: 0 }).eq('id', commerce_id)
          }
        } catch (e) {
          console.error('Push cagnotte à la conversion:', e.message)
        }
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

      /* ── Remise filleul — item négatif sur la 1ère facture payante après trial ── */
      case 'invoice.created': {
        const invoice = event.data.object
        if (!invoice.subscription) break
        // Uniquement la 1ère facture du cycle (pas la facture $0 créée à la souscription)
        if (invoice.billing_reason !== 'subscription_cycle') break
        if (!invoice.amount_due || invoice.amount_due === 0) break
        // Si déjà finalisée (race condition rare), on ne peut plus ajouter d'item
        if (invoice.status !== 'draft') break

        const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
        const meta = subscription.metadata || {}
        if (meta.parrainage_filleul !== 'true' || !meta.parrainage_montant) break

        const montant = parseInt(meta.parrainage_montant, 10)
        if (isNaN(montant) || montant <= 0) break

        try {
          await stripe.invoiceItems.create({
            customer:    invoice.customer,
            invoice:     invoice.id,
            amount:      -montant,
            currency:    'eur',
            description: `Remise parrainage filleul — ${meta.palier || ''}`.trim(),
          })
          // Marquer 'applied' pour idempotence (le check 'true' ci-dessus ne passera plus)
          await stripe.subscriptions.update(invoice.subscription, {
            metadata: { ...meta, parrainage_filleul: 'applied' },
          })
        } catch (err) {
          console.error('Remise filleul invoice.created:', err.message)
        }
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

        // Récupère les infos du parrain
        const { data: parrain } = await supabaseAdmin
          .from('commerces')
          .select('id, nom, stripe_subscription_id, stripe_customer_id, owner_id')
          .eq('id', filleul.parrain_id)
          .maybeSingle()

        const discountAmountsCents = { essentiel: 1000, pro: 1500 }
        const amountOff = discountAmountsCents[filleul.palier] ?? 1000

        if (parrain?.stripe_customer_id) {
          // Parrain avec client Stripe → crédit direct du solde (NÉGATIF = crédit)
          try {
            await stripe.customers.createBalanceTransaction(
              parrain.stripe_customer_id,
              { amount: -amountOff, currency: 'eur',
                description: `Cagnotte parrainage — filleul ${filleul.nom || filleul.id}` },
              { idempotencyKey: `cagnotte-reward-${filleul.id}` }
            )
          } catch (err) {
            console.error('Crédit cagnotte parrain (Stripe):', err.message)
          }
        } else {
          // Parrain sans client Stripe (ambassadeur) → bancarisation en base
          try {
            const { data: p } = await supabaseAdmin
              .from('commerces').select('cagnotte_parrainage_cents')
              .eq('id', parrain.id).maybeSingle()
            await supabaseAdmin.from('commerces')
              .update({ cagnotte_parrainage_cents: (p?.cagnotte_parrainage_cents || 0) + amountOff })
              .eq('id', parrain.id)
          } catch (err) {
            console.error('Bancarisation cagnotte parrain (DB):', err.message)
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
                  subject:     `🎉 Nouveau filleul — ${montant}€ crédités sur votre cagnotte parrainage !`,
                  htmlContent: buildEmailParrain({ parrainNom: parrain.nom, filleulNom: filleul.nom, montant, estPayant: !!parrain?.stripe_customer_id }),
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

function buildEmailParrain({ parrainNom, filleulNom, montant, estPayant }) {
  const siteUrl = 'https://bonmoment.app'
  const sousTitre = estPayant
    ? `Nouveau filleul — ${montant}€ crédités sur votre cagnotte parrainage !`
    : `Nouveau filleul — ${montant}€ crédités sur votre cagnotte parrainage !`
  const corpsRecompense = estPayant
    ? `${montant}€ ont été ajoutés à votre cagnotte parrainage. Ce montant sera automatiquement déduit de vos prochaines mensualités.`
    : `${montant}€ ont été crédités sur votre cagnotte parrainage. Ils seront automatiquement déduits dès le début de votre abonnement payant.`

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F5F5F5;">

<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${filleulNom} a rejoint BONMOMENT — ${montant}€ crédités sur votre cagnotte</div>

<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#F5F5F5" style="background:#F5F5F5;padding:20px 0;">
<tr><td align="center" style="padding:20px 16px;">

<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

  <tr><td style="background:#FF6B00;padding:32px 24px;text-align:center;">
    <span style="font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;color:#FFFFFF;letter-spacing:2px;">BONMOMENT</span>
    <div style="font-size:36px;line-height:1;margin:12px 0 8px;">🎉</div>
    <div style="font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;line-height:1.3;">${sousTitre}</div>
  </td></tr>

  <tr><td style="padding:32px 28px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:15px;color:#3D3D3D;line-height:1.7;">
    <p style="margin:0 0 16px;">Bonjour,</p>
    <p style="margin:0 0 16px;">
      <strong>${filleulNom}</strong> vient de rejoindre BONMOMENT grâce à votre parrainage&nbsp;!
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF0E0;border-radius:10px;margin-bottom:24px;">
      <tr><td style="padding:20px 24px;text-align:center;">
        <p style="margin:0 0 4px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#CC5500;text-transform:uppercase;letter-spacing:1px;">Votre cagnotte parrainage</p>
        <p style="margin:0;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:32px;font-weight:900;color:#FF6B00;line-height:1;">+${montant}€</p>
        <p style="margin:8px 0 0;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:13px;color:#3D3D3D;line-height:1.5;">${corpsRecompense}</p>
      </td></tr>
    </table>
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
