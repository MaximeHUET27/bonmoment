import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { telephone } = body

  if (!telephone)
    return NextResponse.json({ error: 'Paramètre manquant : telephone' }, { status: 400 })

  try {
    const { data, error } = await supabase.rpc('activer_carte_fidelite_client', {
      p_telephone: telephone,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const result = Array.isArray(data) ? data[0] : data
    if (!result?.success)
      return NextResponse.json({ error: result?.message ?? 'Erreur inconnue' }, { status: 400 })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[fidelite/activer-carte]', err.message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
