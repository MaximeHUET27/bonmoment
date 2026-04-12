import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'bonmomentapp@gmail.com'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function calcTVA(debut, fin) {
  const [{ data: recettes }, { data: charges }] = await Promise.all([
    admin.from('recettes').select('montant_ht, montant_tva, date, commerce_nom').eq('statut', 'payee').gte('date', debut).lte('date', fin),
    admin.from('charges').select('montant_ht, montant_tva, taux_tva, autoliquidation, date, fournisseur').gte('date', debut).lte('date', fin),
  ])

  const tva_collectee   = (recettes ?? []).reduce((s, r) => s + Number(r.montant_tva), 0)
  const tva_deductible  = (charges ?? []).filter(c => !c.autoliquidation).reduce((s, c) => s + Number(c.montant_tva), 0)
  const tva_autoliquidee = (charges ?? []).filter(c => c.autoliquidation).reduce((s, c) => s + Number(c.montant_ht) * Number(c.taux_tva) / 100, 0)
  const tva_nette = tva_collectee - tva_deductible

  return {
    tva_collectee:    Math.round(tva_collectee    * 100) / 100,
    tva_deductible:   Math.round(tva_deductible   * 100) / 100,
    tva_autoliquidee: Math.round(tva_autoliquidee * 100) / 100,
    tva_nette:        Math.round(tva_nette        * 100) / 100,
    detail_recettes:  recettes ?? [],
    detail_charges:   charges  ?? [],
  }
}

export async function GET(request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (user.email !== ADMIN_EMAIL)
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const now = new Date()
  const trimestre = Math.floor(now.getMonth() / 3)
  const debutDefaut = new Date(now.getFullYear(), trimestre * 3, 1).toISOString().split('T')[0]
  const finDefaut   = new Date(now.getFullYear(), trimestre * 3 + 3, 0).toISOString().split('T')[0]

  const debut = searchParams.get('debut') || debutDefaut
  const fin   = searchParams.get('fin')   || finDefaut

  const periode = await calcTVA(debut, fin)

  // Historique 12 derniers mois
  const historique_12_periodes = []
  for (let i = 11; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const deb = d.toISOString().split('T')[0]
    const fn  = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
    const mois = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const { tva_collectee, tva_deductible, tva_autoliquidee, tva_nette } = await calcTVA(deb, fn)
    historique_12_periodes.push({ mois, tva_collectee, tva_deductible, tva_autoliquidee, tva_nette })
  }

  return NextResponse.json({ ...periode, debut, fin, historique_12_periodes })
}
