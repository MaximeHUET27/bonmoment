import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { commerceId, mode, identifierValue, prenomOptionnel, modeConsultation, nbTampons } = body

  if (!commerceId || !mode || !identifierValue)
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })

  const { data: commerce } = await admin
    .from('commerces').select('id').eq('id', commerceId).eq('owner_id', user.id).maybeSingle()
  if (!commerce)
    return NextResponse.json({ error: 'Commerce introuvable ou non autorisé' }, { status: 403 })

  try {
    const { data, error } = await supabase.rpc('enregistrer_passage_fidelite', {
      p_commerce_id:        commerceId,
      p_mode_identification: mode,
      p_identifier_value:   identifierValue,
      p_prenom_optionnel:   prenomOptionnel ?? null,
      p_mode_consultation:  modeConsultation ?? false,
      p_nb_tampons:         nbTampons ?? 1,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const result = Array.isArray(data) ? data[0] : data
    if (!result?.success)
      return NextResponse.json({ error: result?.message ?? 'Erreur inconnue' }, { status: 400 })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[fidelite/enregistrer-passage]', err.message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
