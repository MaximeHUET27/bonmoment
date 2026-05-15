import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { isMairieAssoEnabled } from '@/lib/featureFlags'

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

  if (!isMairieAssoEnabled()) {
    return NextResponse.json({ participants: [], count: 0, is_current_user_participating: false })
  }

  // Vérifie si l'utilisateur courant est déjà inscrit
  const { data: myParticipation } = await supabase
    .from('participations_offres')
    .select('id')
    .eq('offre_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  const is_current_user_participating = !!myParticipation

  // Liste complète via RPC (réservée aux propriétaires/membres de l'asso)
  const { data, error } = await supabase.rpc('get_participants_offre', { p_offre_id: id })
  if (error) {
    // Non propriétaire — retourner le compte public + statut participation
    const { count } = await admin
      .from('participations_offres')
      .select('id', { count: 'exact', head: true })
      .eq('offre_id', id)
    return NextResponse.json({ participants: [], count: count ?? 0, is_current_user_participating })
  }

  return NextResponse.json({ participants: data || [], count: (data || []).length, is_current_user_participating })
}

/* POST /api/offres/[id]/participants — s'inscrire à un événement sans bon */
export async function POST(request, { params }) {
  const limited = checkRate(request)
  if (limited) return limited

  const { id: offre_id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  if (!isMairieAssoEnabled()) {
    return NextResponse.json({ error: 'Fonctionnalité non disponible' }, { status: 403 })
  }

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

/* DELETE /api/offres/[id]/participants — se désinscrire d'un événement */
export async function DELETE(request, { params }) {
  const { id: offre_id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  if (!isMairieAssoEnabled()) {
    return NextResponse.json({ error: 'Fonctionnalité non disponible' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('participations_offres')
    .delete()
    .eq('offre_id', offre_id)
    .eq('user_id', user.id)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0)
    return NextResponse.json({ error: 'Participation introuvable' }, { status: 404 })

  return NextResponse.json({ success: true })
}
