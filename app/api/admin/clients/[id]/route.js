import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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

export async function GET(request, { params }) {
  if (!await checkAdmin())
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params

  const [
    { data: userRow },
    { data: resas },
  ] = await Promise.all([
    admin.from('users').select('*').eq('id', id).single(),
    admin.from('reservations')
      .select('id, statut, created_at, utilise_at, code_validation, offres(id, titre, date_fin, commerces(id, nom, ville))')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
  ])

  /* Détails commerces favoris */
  let favorisDetails = []
  if (userRow?.commerces_abonnes?.length) {
    const { data: comms } = await admin.from('commerces')
      .select('id, nom, ville, photo_url')
      .in('id', userRow.commerces_abonnes)
    favorisDetails = comms || []
  }

  const nb_resas   = (resas || []).length
  const nb_utilises = (resas || []).filter(r => r.statut === 'utilisee').length
  const taux_util  = nb_resas > 0 ? Math.round(nb_utilises / nb_resas * 100) : 0

  return NextResponse.json({
    user:     userRow,
    resas:    resas || [],
    favoris:  favorisDetails,
    stats:    { nb_resas, nb_utilises, taux_util },
  })
}

export async function POST(request, { params }) {
  if (!await checkAdmin())
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id }     = await params
  const body       = await request.json()
  const { action } = body

  if (action === 'change_badge') {
    const { badge } = body
    if (!['habitant', 'bon_habitant', 'habitant_exemplaire'].includes(badge))
      return NextResponse.json({ error: 'Badge invalide' }, { status: 400 })
    await admin.from('users').update({ badge_niveau: badge }).eq('id', id)
    return NextResponse.json({ success: true })
  }

  if (action === 'toggle_email') {
    const { data: u } = await admin.from('users').select('notifications_email').eq('id', id).single()
    await admin.from('users').update({ notifications_email: !u?.notifications_email }).eq('id', id)
    return NextResponse.json({ success: true })
  }

  if (action === 'send_email') {
    const { subject, body: emailBody } = body
    const { data: u } = await admin.from('users').select('email, nom').eq('id', id).single()
    if (!u?.email) return NextResponse.json({ error: 'Email introuvable' }, { status: 400 })

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender:      { name: 'BONMOMENT', email: 'bonmomentapp@gmail.com' },
        to:          [{ email: u.email, name: u.nom || '' }],
        subject,
        htmlContent: `<p>${emailBody.replace(/\n/g, '<br>')}</p>`,
      }),
    })
    if (!res.ok) return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'update_notes') {
    await admin.from('users').update({ notes_admin: body.notes }).eq('id', id)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
}

export async function DELETE(request, { params }) {
  if (!await checkAdmin())
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id }      = await params
  const { confirm } = await request.json()
  if (confirm !== 'SUPPRIMER')
    return NextResponse.json({ error: 'Confirmation invalide' }, { status: 400 })

  await admin.from('reservations').delete().eq('user_id', id)
  await admin.from('users').delete().eq('id', id)

  return NextResponse.json({ success: true })
}
