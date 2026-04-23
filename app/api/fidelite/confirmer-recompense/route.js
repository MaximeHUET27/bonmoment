import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { carteId } = body

  if (!carteId)
    return NextResponse.json({ error: 'Paramètre manquant : carteId' }, { status: 400 })

  try {
    const { data, error } = await supabase.rpc('confirmer_recompense_remise', {
      p_carte_id: carteId,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (data === false)
      return NextResponse.json({ error: 'Carte introuvable ou récompense déjà confirmée' }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[fidelite/confirmer-recompense]', err.message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
