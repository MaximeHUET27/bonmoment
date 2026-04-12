import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const ADMIN_EMAIL = 'bonmomentapp@gmail.com'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  // Vérif : cron Vercel OU admin connecté
  const authHeader = request.headers.get('authorization')
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`

  if (!isCron) {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user)
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (user.email !== ADMIN_EMAIL)
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  const errors = []
  let synced = 0

  try {
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 100,
      created: { gte: Math.floor(Date.now() / 1000) - 30 * 86400 },
    })

    const succeeded = paymentIntents.data.filter(pi => pi.status === 'succeeded')

    const rows = succeeded.map(pi => ({
      stripe_payment_id: pi.id,
      stripe_invoice_id: pi.invoice ?? null,
      date: new Date(pi.created * 1000).toISOString().split('T')[0],
      commerce_nom: pi.metadata?.commerce_nom || pi.description || 'Inconnu',
      montant_ht: Math.round((pi.amount / 100 / 1.2) * 100) / 100,
      montant_ttc: pi.amount / 100,
      taux_tva: 20,
      statut: 'payee',
      mode_paiement: 'carte',
    }))

    if (rows.length > 0) {
      const { error } = await admin
        .from('recettes')
        .upsert(rows, { onConflict: 'stripe_payment_id' })
      if (error) errors.push(error.message)
      else synced = rows.length
    }
  } catch (err) {
    errors.push(err.message)
  }

  return NextResponse.json({ synced, errors })
}
