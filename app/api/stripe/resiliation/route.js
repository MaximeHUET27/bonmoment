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

    const resumesAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 // +30 jours
    await stripe.subscriptions.update(subId, {
      pause_collection: {
        behavior:   'void',
        resumes_at: resumesAt,
      },
    })

    return Response.json({ ok: true, message: 'Abonnement mis en pause pour 1 mois' })
  }

  /* ── Résiliation ── */
  if (action === 'resilier') {
    if (subId) {
      // Stripe : annulation fin de période
      await stripe.subscriptions.update(subId, { cancel_at_period_end: true })
    }

    // Dans tous les cas : mise à jour BDD immédiate
    await supabaseAdmin.from('commerces').update({
      abonnement_actif: false,
      palier:           null,
    }).eq('id', commerce_id)

    return Response.json({ ok: true, message: 'Résiliation confirmée' })
  }

  return Response.json({ error: `Action invalide : "${action}"` }, { status: 400 })
}
