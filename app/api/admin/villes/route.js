import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'bonmomentapp@gmail.com'
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (user.email !== ADMIN_EMAIL)
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const [{ data: villes }, { data: commerces }, { data: usersData }, { data: offresActives }] = await Promise.all([
    admin.from('villes').select('id, nom, departement, active').order('nom'),
    admin.from('commerces').select('id, ville, abonnement_actif'),
    admin.from('users').select('id, villes_abonnees'),
    admin.from('offres').select('id, commerces!inner(ville)').eq('statut', 'active').gt('date_fin', new Date().toISOString()),
  ])

  const actifsByVille   = {}
  const offresActByVille = {}
  for (const c of commerces || []) {
    if (c.abonnement_actif && c.ville)
      actifsByVille[c.ville] = (actifsByVille[c.ville] || 0) + 1
  }
  for (const o of offresActives || []) {
    const v = o.commerces?.ville
    if (v) offresActByVille[v] = (offresActByVille[v] || 0) + 1
  }
  const clientsByVille = {}
  for (const u of usersData || []) {
    for (const v of u.villes_abonnees || [])
      clientsByVille[v] = (clientsByVille[v] || 0) + 1
  }

  const result = (villes || []).map(v => ({
    ...v,
    commercants_actifs: actifsByVille[v.nom]    || 0,
    clients_abonnes:    clientsByVille[v.nom]   || 0,
    offres_actives:     offresActByVille[v.nom] || 0,
  }))

  return NextResponse.json({ villes: result })
}

export async function POST(request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (user.email !== ADMIN_EMAIL)
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id, action } = await request.json()
  if (!id || !['activate', 'deactivate'].includes(action))
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })

  await admin.from('villes').update({ active: action === 'activate' }).eq('id', id)
  return NextResponse.json({ success: true })
}
