import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { nouveauTelephone } = body

  if (!nouveauTelephone)
    return NextResponse.json({ error: 'Paramètre manquant : nouveauTelephone' }, { status: 400 })

  try {
    const { data, error } = await supabase.rpc('modifier_telephone_client', {
      p_nouveau_telephone: nouveauTelephone,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const result = Array.isArray(data) ? data[0] : data
    if (!result?.success)
      return NextResponse.json({ error: result?.message ?? 'Erreur inconnue' }, { status: 400 })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[fidelite/modifier-telephone]', err.message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
