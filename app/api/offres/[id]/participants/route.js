import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const checkRate = rateLimit({ maxRequests: 30, windowMs: 60 * 1000 })

/* GET /api/offres/[id]/participants — liste des participants (owner ou membre asso) */
export async function GET(request, { params }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const { data, error } = await supabase.rpc('get_participants_offre', { p_offre_id: id })
  if (error) return NextResponse.json({ error: error.message }, { status: 403 })

  return NextResponse.json({ participants: data || [], count: (data || []).length })
}

/* POST /api/offres/[id]/participants — s'inscrire à un événement sans bon */
export async function POST(request, { params }) {
  const limited = checkRate(request)
  if (limited) return limited

  const { id: offre_id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const { data: offre } = await admin
    .from('offres')
    .select('avec_bon, statut, date_fin')
    .eq('id', offre_id)
    .single()

  if (!offre) return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 })
  if (offre.avec_bon !== false)
    return NextResponse.json({ error: 'Réservation de bon requise pour cette offre' }, { status: 400 })
  if (offre.statut !== 'active' || new Date(offre.date_fin) < new Date())
    return NextResponse.json({ error: 'Offre expirée' }, { status: 410 })

  const { error: insertErr } = await admin
    .from('participations_offres')
    .insert({ offre_id, user_id: user.id })

  if (insertErr) {
    if (insertErr.code === '23505')
      return NextResponse.json({ success: true, already: true })
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
