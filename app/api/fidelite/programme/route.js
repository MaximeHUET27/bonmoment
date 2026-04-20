import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { commerceId, seuilPassages, descriptionRecompense, regleTampons, actif } = body

  if (!commerceId || seuilPassages === undefined || seuilPassages === null || !descriptionRecompense || actif === undefined)
    return NextResponse.json({ error: 'Paramètres manquants : commerceId, seuilPassages, descriptionRecompense, actif' }, { status: 400 })

  try {
    const { data, error } = await supabase.rpc('mettre_a_jour_programme_fidelite', {
      p_commerce_id:           commerceId,
      p_seuil_passages:        seuilPassages,
      p_description_recompense: descriptionRecompense,
      p_actif:                 actif,
      p_regle_tampons:         regleTampons ?? null,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const result = Array.isArray(data) ? data[0] : data
    if (!result?.success)
      return NextResponse.json({ error: result?.message ?? 'Erreur inconnue' }, { status: 400 })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[fidelite/programme]', err.message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
