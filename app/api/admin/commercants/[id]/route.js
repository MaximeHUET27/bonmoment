import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const ADMIN_EMAIL = 'bonmomentapp@gmail.com'
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (user.email !== ADMIN_EMAIL) return null
  return user
}

/* ── GET : fiche détail ── */
export async function GET(request, { params }) {
  if (!await checkAdmin())
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params

  const [
    { data: commerce },
    { data: offres },
    { data: parrainages },
  ] = await Promise.all([
    admin.from('commerces').select('*').eq('id', id).single(),
    admin.from('offres')
      .select('id, titre, type_remise, valeur, statut, date_debut, date_fin, nb_bons_total, nb_bons_restants, created_at')
      .eq('commerce_id', id)
      .order('created_at', { ascending: false }),
    admin.from('parrainages')
      .select('id, code, date_expiration, filleuls:parrainages_filleuls(user_id, created_at, users(nom, email))')
      .eq('parrain_id', id)
      .maybeSingle()
      .catch(() => ({ data: null })),
  ])

  /* Réservations par offre */
  const offreIds = (offres || []).map(o => o.id)
  let reservationsByOffre = {}
  if (offreIds.length) {
    const { data: resas } = await admin.from('reservations')
      .select('offre_id, statut, created_at, utilise_at')
      .in('offre_id', offreIds)
    for (const r of resas || []) {
      if (!reservationsByOffre[r.offre_id]) reservationsByOffre[r.offre_id] = []
      reservationsByOffre[r.offre_id].push(r)
    }
  }

  const offresWithStats = (offres || []).map(o => {
    const resas   = reservationsByOffre[o.id] || []
    const utilises = resas.filter(r => r.statut === 'utilisee').length
    const expires  = resas.filter(r => r.statut === 'expiree').length
    return { ...o, nb_reservations: resas.length, nb_utilises: utilises, nb_expires: expires }
  })

  const totalBons     = offresWithStats.reduce((s, o) => s + o.nb_reservations, 0)
  const totalUtilises = offresWithStats.reduce((s, o) => s + o.nb_utilises,     0)
  const tauxUtil      = totalBons > 0 ? Math.round(totalUtilises / totalBons * 100) : 0

  /* Stripe invoices */
  let invoices = []
  if (commerce?.stripe_customer_id) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
      const inv    = await stripe.invoices.list({ customer: commerce.stripe_customer_id, limit: 20 })
      invoices     = inv.data.map(i => ({
        id:      i.id,
        date:    new Date(i.created * 1000).toISOString(),
        montant: i.amount_paid / 100,
        statut:  i.status,
        url:     i.hosted_invoice_url,
      }))
    } catch {}
  }

  return NextResponse.json({
    commerce,
    offres:  offresWithStats,
    stats:   { total_bons: totalBons, total_utilises: totalUtilises, taux_util: tauxUtil, nb_offres: offres?.length || 0 },
    invoices,
    parrainage: parrainages || null,
  })
}

/* ── POST : actions ── */
export async function POST(request, { params }) {
  if (!await checkAdmin())
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id }    = await params
  const body      = await request.json()
  const { action } = body

  if (action === 'deactivate') {
    const { data: c } = await admin.from('commerces').select('nom').eq('id', id).single()
    const { count: nbOffres } = await admin.from('offres')
      .select('*', { count: 'exact', head: true }).eq('commerce_id', id).eq('statut', 'active')
    await admin.from('commerces').update({ abonnement_actif: false }).eq('id', id)
    await admin.from('offres').update({ statut: 'annulee' }).eq('commerce_id', id).eq('statut', 'active')
    return NextResponse.json({ success: true, nb_offres_annulees: nbOffres })
  }

  if (action === 'activate') {
    await admin.from('commerces').update({ abonnement_actif: true }).eq('id', id)
    return NextResponse.json({ success: true })
  }

  if (action === 'change_palier') {
    const { palier } = body
    if (!['decouverte', 'essentiel', 'pro'].includes(palier))
      return NextResponse.json({ error: 'Palier invalide' }, { status: 400 })
    await admin.from('commerces').update({ palier }).eq('id', id)
    return NextResponse.json({ success: true })
  }

  if (action === 'prolonger_essai') {
    const { jours } = body
    if (!jours || jours < 1)
      return NextResponse.json({ error: 'Nombre de jours invalide' }, { status: 400 })
    const { data: c } = await admin.from('commerces').select('date_fin_essai').eq('id', id).single()
    const base   = c?.date_fin_essai ? new Date(c.date_fin_essai) : new Date()
    base.setDate(base.getDate() + Number(jours))
    await admin.from('commerces').update({ date_fin_essai: base.toISOString() }).eq('id', id)
    return NextResponse.json({ success: true, nouvelle_date: base.toISOString() })
  }

  if (action === 'send_email') {
    const { subject, body: emailBody } = body
    const { data: c } = await admin.from('commerces').select('email, nom').eq('id', id).single()
    if (!c?.email) return NextResponse.json({ error: 'Email introuvable' }, { status: 400 })

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key':      process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender:   { name: 'BONMOMENT', email: 'bonmomentapp@gmail.com' },
        to:       [{ email: c.email, name: c.nom || '' }],
        subject,
        htmlContent: `<p>${emailBody.replace(/\n/g, '<br>')}</p>`,
      }),
    })
    if (!res.ok) return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'update_notes') {
    await admin.from('commerces').update({ notes_admin: body.notes }).eq('id', id)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
}

/* ── DELETE : suppression définitive ── */
export async function DELETE(request, { params }) {
  if (!await checkAdmin())
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params
  const { confirm } = await request.json()
  if (confirm !== 'SUPPRIMER')
    return NextResponse.json({ error: 'Confirmation invalide' }, { status: 400 })

  // Récupérer toutes les offres du commerce
  const { data: offres } = await admin.from('offres').select('id').eq('commerce_id', id)
  const offreIds = (offres || []).map(o => o.id)

  // Supprimer dans l'ordre : réservations → offres → commerce
  if (offreIds.length) {
    await admin.from('reservations').delete().in('offre_id', offreIds)
    await admin.from('offres').delete().in('id', offreIds)
  }
  await admin.from('commerces').delete().eq('id', id)

  return NextResponse.json({ success: true })
}
