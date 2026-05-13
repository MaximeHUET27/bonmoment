import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/* GET /api/commercant/offres-collectives?commerce_id=xxx
 * Retourne les offres actives des mairie_asso dont le commerce est membre accepté.
 * Utilise la RPC get_offres_collectives_commerce (SECURITY DEFINER).
 */
export async function GET(request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const commerce_id = searchParams.get('commerce_id')
  if (!commerce_id) return NextResponse.json({ error: 'commerce_id manquant' }, { status: 400 })

  const { data, error } = await supabase.rpc('get_offres_collectives_commerce', {
    p_commerce_id: commerce_id,
  })

  if (error) {
    if (error.message?.includes('Accès refusé'))
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ offres: data || [] })
}
