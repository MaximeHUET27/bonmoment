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
    { data: offres },
    { data: reservations },
  ] = await Promise.all([
    admin.from('offres')
      .select('id, titre, type_remise, valeur, statut, date_debut, date_fin, created_at, nb_bons_total, nb_bons_restants, commerces(id, nom, ville)')
      .order('created_at', { ascending: false }),
    admin.from('reservations').select('offre_id, statut'),
  ])

  const resaByOffre    = {}
  const utilisesByOffre = {}
  for (const r of reservations || []) {
    resaByOffre[r.offre_id] = (resaByOffre[r.offre_id] || 0) + 1
    if (r.statut === 'utilisee')
      utilisesByOffre[r.offre_id] = (utilisesByOffre[r.offre_id] || 0) + 1
  }

  const result = (offres || []).map(o => ({
    ...o,
    nb_reservations:  resaByOffre[o.id]    || 0,
    nb_bons_utilises: utilisesByOffre[o.id] || 0,
  }))

  return NextResponse.json({ offres: result })
}
