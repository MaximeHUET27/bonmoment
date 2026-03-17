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
  if (!user || user.email !== ADMIN_EMAIL)
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const [
    { data: users },
    { data: reservations },
  ] = await Promise.all([
    admin.from('users').select('id, nom, email, avatar_url, badge_niveau, villes_abonnees, created_at')
      .order('created_at', { ascending: false }),
    admin.from('reservations').select('user_id, statut'),
  ])

  const resaByUser    = {}
  const utilisesByUser = {}
  for (const r of reservations || []) {
    resaByUser[r.user_id] = (resaByUser[r.user_id] || 0) + 1
    if (r.statut === 'utilisee')
      utilisesByUser[r.user_id] = (utilisesByUser[r.user_id] || 0) + 1
  }

  const result = (users || []).map(u => ({
    ...u,
    nb_reservations:  resaByUser[u.id]    || 0,
    nb_bons_utilises: utilisesByUser[u.id] || 0,
  }))

  return NextResponse.json({ clients: result })
}
