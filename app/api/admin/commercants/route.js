import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'bonmomentapp@gmail.com'
const LIMIT = 50

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

export async function GET(request) {
  if (!await checkAdmin())
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const page      = parseInt(searchParams.get('page') || '0')
  const search    = searchParams.get('search') || ''
  const ville     = searchParams.get('ville') || ''
  const palier    = searchParams.get('palier') || ''
  const statut    = searchParams.get('statut') || ''

  let query = admin.from('commerces')
    .select('id, nom, email, ville, palier, abonnement_actif, date_fin_essai, created_at, last_login_at, photo_url, adresse, telephone, note_google, categorie, stripe_customer_id, notes_admin', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * LIMIT, (page + 1) * LIMIT - 1)

  if (search) query = query.or(`nom.ilike.%${search}%,email.ilike.%${search}%`)
  if (ville)  query = query.eq('ville', ville)
  if (palier) query = query.eq('palier', palier)
  if (statut === 'actif')   query = query.eq('abonnement_actif', true)
  if (statut === 'inactif') query = query.eq('abonnement_actif', false)

  const { data: commerces, count } = await query

  /* Stats offres + bons ce mois */
  const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const ids = (commerces || []).map(c => c.id)

  const [{ data: offresAll }, { data: offresM }, { data: reservations }] = await Promise.all([
    ids.length ? admin.from('offres').select('id, commerce_id, created_at').in('commerce_id', ids) : { data: [] },
    ids.length ? admin.from('offres').select('commerce_id').in('commerce_id', ids).gte('created_at', debutMois) : { data: [] },
    ids.length ? admin.from('reservations').select('offre_id, statut') : { data: [] },
  ])

  const offreMap  = {}
  const offreMMap = {}
  for (const o of offresAll || []) {
    offreMap[o.commerce_id]  = (offreMap[o.commerce_id] || 0) + 1
  }
  for (const o of offresM || []) {
    offreMMap[o.commerce_id] = (offreMMap[o.commerce_id] || 0) + 1
  }

  const offreIds = new Set((offresAll || []).map(o => o.id))
  const utilMap  = {}
  for (const r of reservations || []) {
    if (!offreIds.has(r.offre_id) || r.statut !== 'utilisee') continue
    // no commerce_id in reservations directly, skip granular merge here
  }

  const result = (commerces || []).map(c => ({
    ...c,
    nb_offres_total:  offreMap[c.id]  || 0,
    offres_ce_mois:   offreMMap[c.id] || 0,
    nb_bons_utilises: 0, // computed in detail
  }))

  return NextResponse.json({ commercants: result, total: count || 0 })
}
