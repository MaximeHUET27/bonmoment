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
  const page     = parseInt(searchParams.get('page') || '0')
  const search   = searchParams.get('search')   || ''
  const ville    = searchParams.get('ville')    || ''
  const statut   = searchParams.get('statut')   || ''
  const type     = searchParams.get('type')     || ''
  const commerce = searchParams.get('commerce') || ''

  let query = admin.from('offres')
    .select('id, titre, type_remise, valeur, statut, date_debut, date_fin, nb_bons_total, nb_bons_restants, created_at, commerces!inner(id, nom, ville)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * LIMIT, (page + 1) * LIMIT - 1)

  if (search)   query = query.or(`titre.ilike.%${search}%,commerces.nom.ilike.%${search}%`)
  if (ville)    query = query.eq('commerces.ville', ville)
  if (statut)   query = query.eq('statut', statut)
  if (type)     query = query.eq('type_remise', type)
  if (commerce) query = query.eq('commerce_id', commerce)

  const { data: offres, count } = await query

  const ids = (offres || []).map(o => o.id)
  let resaMap = {}, utilMap = {}
  if (ids.length) {
    const [{ data: resas }, { data: utils }] = await Promise.all([
      admin.from('reservations').select('offre_id').in('offre_id', ids),
      admin.from('reservations').select('offre_id').eq('statut', 'utilisee').in('offre_id', ids),
    ])
    for (const r of resas || []) resaMap[r.offre_id] = (resaMap[r.offre_id] || 0) + 1
    for (const r of utils || []) utilMap[r.offre_id] = (utilMap[r.offre_id] || 0) + 1
  }

  /* Mini-stats en haut */
  const now = new Date().toISOString()
  const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const [
    { count: nbActives },
    { count: nbMois },
    { count: resasMoisTotal },
    { count: utilisesMoisTotal },
  ] = await Promise.all([
    admin.from('offres').select('*', { count: 'exact', head: true }).eq('statut', 'active').gt('date_fin', now),
    admin.from('offres').select('*', { count: 'exact', head: true }).gte('created_at', debutMois),
    admin.from('reservations').select('*', { count: 'exact', head: true }).gte('created_at', debutMois),
    admin.from('reservations').select('*', { count: 'exact', head: true }).eq('statut', 'utilisee').gte('utilise_at', debutMois),
  ])

  const avgResa = nbMois > 0 ? +((resasMoisTotal || 0) / nbMois).toFixed(1) : 0
  const tauxUtil = (resasMoisTotal || 0) > 0 ? Math.round((utilisesMoisTotal || 0) / resasMoisTotal * 100) : 0

  const result = (offres || []).map(o => ({
    ...o,
    nb_reservations:  resaMap[o.id] || 0,
    nb_bons_utilises: utilMap[o.id] || 0,
    taux: resaMap[o.id] > 0 ? Math.round((utilMap[o.id] || 0) / resaMap[o.id] * 100) : 0,
  }))

  return NextResponse.json({
    offres: result,
    total:  count || 0,
    stats:  { nb_actives: nbActives || 0, nb_mois: nbMois || 0, avg_resa: avgResa, taux_util: tauxUtil },
  })
}
