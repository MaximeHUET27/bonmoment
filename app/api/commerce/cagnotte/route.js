import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const commerceId = new URL(request.url).searchParams.get('commerce_id')
  if (!commerceId) return Response.json({ error: 'commerce_id manquant' }, { status: 400 })

  const { data: commerce } = await supabase
    .from('commerces')
    .select('id, stripe_customer_id, cagnotte_parrainage_cents')
    .eq('id', commerceId)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!commerce) return Response.json({ error: 'Commerce introuvable' }, { status: 404 })

  let creditStripe = 0
  if (commerce.stripe_customer_id) {
    try {
      const cust = await stripe.customers.retrieve(commerce.stripe_customer_id)
      if (cust && typeof cust.balance === 'number' && cust.balance < 0) {
        creditStripe = -cust.balance
      }
    } catch (e) {
      console.error('Lecture solde Stripe cagnotte:', e.message)
    }
  }

  return Response.json({ cents: creditStripe + (commerce.cagnotte_parrainage_cents || 0) })
}
