import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  try {
    const { data, error } = await supabase.rpc('desactiver_fidelite_client')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (data === false)
      return NextResponse.json({ error: 'Aucune carte fidélité à désactiver' }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[fidelite/desactiver]', err.message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
