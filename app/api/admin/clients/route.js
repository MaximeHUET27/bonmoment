import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'bonmomentapp@gmail.com'
const LIMIT = 50

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (user.email !== ADMIN_EMAIL)
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const page   = parseInt(searchParams.get('page') || '0')
  const search = searchParams.get('search') || ''
  const ville  = searchParams.get('ville')  || ''
  const badge  = searchParams.get('badge')  || ''

  let query = admin.from('users')
    .select('id, nom, email, avatar_url, badge_niveau, villes_abonnees, commerces_abonnes, created_at, notifications_email, notes_admin', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * LIMIT, (page + 1) * LIMIT - 1)

  if (search) query = query.or(`nom.ilike.%${search}%,email.ilike.%${search}%`)
  if (badge)  query = query.eq('badge_niveau', badge)
  if (ville)  query = query.contains('villes_abonnees', [ville])

  const { data: users, count } = await query
  const ids = (users || []).map(u => u.id)

  let resaMap = {}, utilMap = {}
  if (ids.length) {
    const [{ data: resas }, { data: utils }] = await Promise.all([
      admin.from('reservations').select('user_id').in('user_id', ids),
      admin.from('reservations').select('user_id').eq('statut', 'utilisee').in('user_id', ids),
    ])
    for (const r of resas  || []) resaMap[r.user_id]  = (resaMap[r.user_id]  || 0) + 1
    for (const r of utils  || []) utilMap[r.user_id]  = (utilMap[r.user_id]  || 0) + 1
  }

  /* Top 5 clients du mois */
  const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const { data: topResas } = await admin.from('reservations')
    .select('user_id')
    .eq('statut', 'utilisee')
    .gte('utilise_at', debutMois)
  const topMap = {}
  for (const r of topResas || []) topMap[r.user_id] = (topMap[r.user_id] || 0) + 1
  const top5ids = Object.entries(topMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([uid]) => uid)
  let top5 = []
  if (top5ids.length) {
    const { data: topUsers } = await admin.from('users')
      .select('id, nom, badge_niveau, avatar_url')
      .in('id', top5ids)
    top5 = top5ids.map(uid => ({
      ...(topUsers || []).find(u => u.id === uid),
      nb_utilises_mois: topMap[uid],
    }))
  }

  const result = (users || []).map(u => ({
    ...u,
    nb_reservations:  resaMap[u.id]  || 0,
    nb_bons_utilises: utilMap[u.id]  || 0,
    taux_util: resaMap[u.id] > 0
      ? Math.round((utilMap[u.id] || 0) / resaMap[u.id] * 100) : 0,
  }))

  return NextResponse.json({ clients: result, total: count || 0, top5 })
}
