import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'bonmomentapp@gmail.com'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (user.email !== ADMIN_EMAIL)
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const debut = searchParams.get('debut') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const fin   = searchParams.get('fin')   || new Date().toISOString().split('T')[0]
  const page  = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'))

  const from = (page - 1) * limit
  const to   = page * limit - 1

  const { data, count, error } = await admin
    .from('recettes')
    .select('*', { count: 'exact' })
    .gte('date', debut)
    .lte('date', fin)
    .order('date', { ascending: false })
    .range(from, to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Totaux sur la période complète (sans pagination)
  const { data: tous } = await admin
    .from('recettes')
    .select('montant_ht, montant_tva, montant_ttc')
    .gte('date', debut)
    .lte('date', fin)

  const totaux = {
    montant_ht:  Math.round((tous ?? []).reduce((s, r) => s + Number(r.montant_ht),  0) * 100) / 100,
    montant_tva: Math.round((tous ?? []).reduce((s, r) => s + Number(r.montant_tva), 0) * 100) / 100,
    montant_ttc: Math.round((tous ?? []).reduce((s, r) => s + Number(r.montant_ttc), 0) * 100) / 100,
  }

  return NextResponse.json({ data, total_count: count, totaux, page, limit })
}
