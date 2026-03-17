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
  if (!user || user.email !== ADMIN_EMAIL) return null
  return user
}

/* ── GET : liste tous les commerçants avec stats ─────────────────────────── */
export async function GET() {
  if (!await checkAdmin())
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const [
    { data: commerces },
    { data: offres },
    { data: reservations },
  ] = await Promise.all([
    admin.from('commerces').select('*').order('created_at', { ascending: false }),
    admin.from('offres').select('id, commerce_id, statut'),
    admin.from('reservations').select('offre_id, statut'),
  ])

  // Nombre d'offres par commerce
  const offresByCommerce = {}
  for (const o of offres || []) {
    offresByCommerce[o.commerce_id] = (offresByCommerce[o.commerce_id] || 0) + 1
  }

  // Associer chaque réservation à un commerce via les offres
  const offreIdToCommerce = {}
  for (const o of offres || []) offreIdToCommerce[o.id] = o.commerce_id

  const utilisesByCommerce = {}
  for (const r of reservations || []) {
    if (r.statut !== 'utilisee') continue
    const cid = offreIdToCommerce[r.offre_id]
    if (cid) utilisesByCommerce[cid] = (utilisesByCommerce[cid] || 0) + 1
  }

  const result = (commerces || []).map(c => ({
    ...c,
    nb_offres:        offresByCommerce[c.id]  || 0,
    nb_bons_utilises: utilisesByCommerce[c.id] || 0,
  }))

  return NextResponse.json({ commercants: result })
}

/* ── POST : activer / désactiver un commerce ─────────────────────────────── */
export async function POST(request) {
  if (!await checkAdmin())
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id, action } = await request.json()
  if (!id || !['activate', 'deactivate'].includes(action))
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })

  if (action === 'deactivate') {
    // Désactiver le commerce
    await admin.from('commerces').update({ abonnement_actif: false }).eq('id', id)
    // Annuler ses offres actives
    await admin.from('offres').update({ statut: 'annulee' })
      .eq('commerce_id', id).eq('statut', 'active')
  } else {
    await admin.from('commerces').update({ abonnement_actif: true }).eq('id', id)
  }

  return NextResponse.json({ success: true })
}
