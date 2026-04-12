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

  const [{ data: offre }, { data: resas }] = await Promise.all([
    admin.from('offres')
      .select('*, commerces(id, nom, ville, adresse, photo_url, email, telephone)')
      .eq('id', id)
      .single(),
    admin.from('reservations')
      .select('id, statut, created_at, utilise_at, code_validation, users(id, nom, email, avatar_url)')
      .eq('offre_id', id)
      .order('created_at', { ascending: false }),
  ])

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
