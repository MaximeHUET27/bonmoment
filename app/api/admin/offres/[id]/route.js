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

  try {
    const [{ data: offre, error: offreError }, { data: resas }] = await Promise.all([
      admin.from('offres')
        .select('*, commerces(id, nom, ville, adresse, photo_url, telephone)')
        .eq('id', id)
        .single(),
      admin.from('reservations')
        .select('id, statut, created_at, utilise_at, code_validation, users(id, nom, email, avatar_url)')
        .eq('offre_id', id)
        .order('created_at', { ascending: false }),
    ])

    if (offreError || !offre)
      return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 })

    /* Timeline heure par heure */
    const timeline = {}
    for (const r of resas || []) {
      const h = new Date(r.created_at).toISOString().substring(0, 13)
      timeline[h] = (timeline[h] || 0) + 1
    }
    const timelineArr = Object.entries(timeline)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([heure, nb]) => ({ heure: heure + ':00', nb }))

    return NextResponse.json({ offre, resas: resas || [], timeline: timelineArr })
  } catch (err) {
    console.error('[admin/offres/[id] GET]', err)
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  if (!await checkAdmin())
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id }     = await params
  const body       = await request.json()
  const { action } = body

  if (action === 'annuler') {
    const { count } = await admin.from('reservations')
      .select('*', { count: 'exact', head: true }).eq('offre_id', id).eq('statut', 'reservee')
    await admin.from('offres').update({ statut: 'annulee' }).eq('id', id)
    await admin.from('reservations').update({ statut: 'annulee' }).eq('offre_id', id).eq('statut', 'reservee')
    return NextResponse.json({ success: true, nb_annules: count || 0 })
  }

  if (action === 'expirer') {
    await admin.from('offres').update({ statut: 'expiree', date_fin: new Date().toISOString() }).eq('id', id)
    await admin.from('reservations').update({ statut: 'expiree' }).eq('offre_id', id).eq('statut', 'reservee')
    return NextResponse.json({ success: true })
  }

  if (action === 'modifier') {
    const { date_fin, nb_bons_restants } = body
    const update = {}

    if (date_fin !== undefined && date_fin !== '') {
      const fin = new Date(date_fin)
      if (isNaN(fin.getTime()))
        return NextResponse.json({ error: 'Date de fin invalide' }, { status: 400 })
      const { data: cur } = await admin.from('offres').select('date_debut').eq('id', id).single()
      if (cur?.date_debut && fin <= new Date(cur.date_debut))
        return NextResponse.json({ error: 'La date de fin doit être après le début' }, { status: 400 })
      update.date_fin = fin.toISOString()
    }

    if (nb_bons_restants !== undefined && nb_bons_restants !== '') {
      const val = parseInt(nb_bons_restants, 10)
      if (isNaN(val) || val < 0)
        return NextResponse.json({ error: 'Nombre de bons invalide' }, { status: 400 })
      update.nb_bons_restants = val
    }

    if (Object.keys(update).length === 0)
      return NextResponse.json({ error: 'Aucun champ à modifier' }, { status: 400 })

    const { error: updateErr } = await admin.from('offres').update(update).eq('id', id)
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
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

  await admin.from('reservations').delete().eq('offre_id', id)
  await admin.from('offres').delete().eq('id', id)

  return NextResponse.json({ success: true })
}
