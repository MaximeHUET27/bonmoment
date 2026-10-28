import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { PALIER_BASIC } from '@/lib/paliers'

/**
 * POST /api/commercant/activer-basic  { commerce_id }
 *
 * Place un commerce SANS palier sur l'offre gratuite Basic
 * (palier = 'basic', abonnement_actif = true).
 *
 * Sécurité :
 *  - utilisateur authentifié, propriétaire du commerce (owner_id) ;
 *  - n'agit QUE si palier IS NULL et aucun abonnement Stripe : impossible
 *    de rétrograder un palier payant, de réactiver un compte suspendu par
 *    l'admin (palier conservé) ou de s'attribuer un palier payant ;
 *  - les colonnes de facturation restent interdites en écriture au rôle
 *    authenticated (sql/lock_billing_columns.sql) : seule cette route
 *    service_role les touche, avec les gardes ci-dessus. Idempotent.
 */
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const checkRate = rateLimit({ maxRequests: 10, windowMs: 10 * 60 * 1000 })

export async function POST(request) {
  const limited = await checkRate(request)
  if (limited) return limited

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const commerceId = body.commerce_id
  if (!commerceId || typeof commerceId !== 'string')
    return NextResponse.json({ error: 'commerce_id manquant' }, { status: 400 })

  const { data: updated, error } = await admin
    .from('commerces')
    .update({ palier: PALIER_BASIC, abonnement_actif: true })
    .eq('id', commerceId)
    .eq('owner_id', user.id)
    .is('palier', null)
    .is('stripe_subscription_id', null)
    .select('id, palier')

  if (error) {
    console.error('[activer-basic]', error.message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  return NextResponse.json({ success: true, active: (updated?.length ?? 0) > 0 })
}
