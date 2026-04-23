import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { carteId, nbTampons, commentaire } = body

  if (!carteId || nbTampons === undefined || nbTampons === null || !commentaire)
    return NextResponse.json({ error: 'Paramètres manquants : carteId, nbTampons, commentaire' }, { status: 400 })

  try {
    const { data, error } = await supabase.rpc('ajuster_tampons_manuel', {
      p_carte_id:    carteId,
      p_nb_tampons:  nbTampons,
      p_commentaire: commentaire,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const result = Array.isArray(data) ? data[0] : data
    if (!result?.success)
      return NextResponse.json({ error: result?.message ?? 'Erreur inconnue' }, { status: 400 })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[fidelite/ajuster-tampons]', err.message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
