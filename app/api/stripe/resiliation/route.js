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

  // Vérifie la propriété ET récupère les colonnes Stripe + statut
  const { data: commerce } = await supabase
    .from('commerces')
    .select('stripe_subscription_id, abonnement_actif, palier')
    .eq('id', commerce_id)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!commerce || (!commerce.abonnement_actif && !commerce.palier)) {
    return Response.json({ error: 'Aucun abonnement actif' }, { status: 404 })
  }

  const subId = commerce.stripe_subscription_id  // peut être null (activation admin)

  /* ── Pause 1 mois (Stripe uniquement) ── */
  if (action === 'pause') {
    if (!subId) {
      return Response.json({ error: 'La pause n\'est disponible que pour les abonnements Stripe' }, { status: 400 })
    }

    const resumesAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
    await stripe.subscriptions.update(subId, {
      pause_collection: {
        behavior:   'void',
        resumes_at: resumesAt,
      },
    })

    return Response.json({ ok: true, message: 'Abonnement mis en pause pour 1 mois' })
  }

  /* ── Résiliation (fin de période, pas immédiate) ── */
  if (action === 'resilier') {
    let dateFin

    if (subId) {
      // Stripe : annulation en fin de période en cours
      const updatedSub = await stripe.subscriptions.update(subId, {
        cancel_at_period_end: true,
      })
      dateFin = new Date(updatedSub.current_period_end * 1000).toISOString()
    } else {
      // Admin bypass : fin de mois en cours
      const now = new Date()
      dateFin = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
    }

    // Marquer la résiliation prévue en BDD — NE PAS désactiver l'abonnement
    // C'est le webhook customer.subscription.deleted qui mettra abonnement_actif = false
    await supabaseAdmin.from('commerces').update({
      resiliation_prevue:   true,
      date_fin_abonnement:  dateFin,
    }).eq('id', commerce_id)

    return Response.json({ ok: true, date_fin: dateFin })
  }

  return Response.json({ error: `Action invalide : "${action}"` }, { status: 400 })
}
