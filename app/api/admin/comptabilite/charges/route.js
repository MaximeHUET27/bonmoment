import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'bonmomentapp@gmail.com'
const CATEGORIES_VALIDES = ['hebergement','services','materiel','deplacements','marketing','juridique','autres']

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkAdmin(request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (user.email !== ADMIN_EMAIL) return null
  return user
}

export async function GET(request) {
  const user = await checkAdmin(request)
  if (!user) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const debut     = searchParams.get('debut')
  const fin       = searchParams.get('fin')
  const categorie = searchParams.get('categorie')
  const recurrente = searchParams.get('recurrente')
  const page  = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'))

  let query = admin.from('charges').select('*', { count: 'exact' })
  if (debut) query = query.gte('date', debut)
  if (fin)   query = query.lte('date', fin)
  if (categorie) query = query.eq('categorie', categorie)
  if (recurrente === 'true') query = query.eq('recurrente', true)

  const { data, count, error } = await query
    .order('date', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Totaux par catégorie sur la période complète
  let totQuery = admin.from('charges').select('categorie, montant_ht, montant_tva, montant_ttc')
  if (debut) totQuery = totQuery.gte('date', debut)
  if (fin)   totQuery = totQuery.lte('date', fin)
  if (categorie) totQuery = totQuery.eq('categorie', categorie)
  const { data: tous } = await totQuery

  const map = {}
  for (const r of (tous ?? [])) {
    if (!map[r.categorie]) map[r.categorie] = { categorie: r.categorie, total_ht: 0, total_tva: 0, total_ttc: 0 }
    map[r.categorie].total_ht  += Number(r.montant_ht)
    map[r.categorie].total_tva += Number(r.montant_tva)
    map[r.categorie].total_ttc += Number(r.montant_ttc)
  }
  const totaux_par_categorie = Object.values(map).map(c => ({
    ...c,
    total_ht:  Math.round(c.total_ht  * 100) / 100,
    total_tva: Math.round(c.total_tva * 100) / 100,
    total_ttc: Math.round(c.total_ttc * 100) / 100,
  }))

  return NextResponse.json({ data, total_count: count, totaux_par_categorie, page, limit })
}

export async function POST(request) {
  const user = await checkAdmin(request)
  if (!user) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const body = await request.json()
  const { date, fournisseur, description, montant_ht, taux_tva, categorie, autoliquidation, recurrente, periodicite } = body

  if (!date || !fournisseur?.trim())
    return NextResponse.json({ error: 'Date et fournisseur requis' }, { status: 400 })
  if (!montant_ht || Number(montant_ht) <= 0)
    return NextResponse.json({ error: 'Montant HT invalide' }, { status: 400 })
  if (!CATEGORIES_VALIDES.includes(categorie))
    return NextResponse.json({ error: 'Catégorie invalide' }, { status: 400 })

  const { data, error } = await admin
    .from('charges')
    .insert({ date, fournisseur: fournisseur.trim(), description, montant_ht, taux_tva: taux_tva ?? 20, categorie, autoliquidation: autoliquidation ?? false, recurrente: recurrente ?? false, periodicite: periodicite || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(request) {
  const user = await checkAdmin(request)
  if (!user) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  const body = await request.json()
  const { date, fournisseur, description, montant_ht, taux_tva, categorie, autoliquidation, recurrente, periodicite, justificatif_url } = body

  if (fournisseur !== undefined && !fournisseur?.trim())
    return NextResponse.json({ error: 'Fournisseur requis' }, { status: 400 })
  if (montant_ht !== undefined && Number(montant_ht) <= 0)
    return NextResponse.json({ error: 'Montant HT invalide' }, { status: 400 })
  if (categorie !== undefined && !CATEGORIES_VALIDES.includes(categorie))
    return NextResponse.json({ error: 'Catégorie invalide' }, { status: 400 })

  const updates = {}
  if (date !== undefined) updates.date = date
  if (fournisseur !== undefined) updates.fournisseur = fournisseur.trim()
  if (description !== undefined) updates.description = description
  if (montant_ht !== undefined) updates.montant_ht = montant_ht
  if (taux_tva !== undefined) updates.taux_tva = taux_tva
  if (categorie !== undefined) updates.categorie = categorie
  if (autoliquidation !== undefined) updates.autoliquidation = autoliquidation
  if (recurrente !== undefined) updates.recurrente = recurrente
  if (periodicite !== undefined) updates.periodicite = periodicite
  if (justificatif_url !== undefined) updates.justificatif_url = justificatif_url

  const { data, error } = await admin
    .from('charges')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request) {
  const user = await checkAdmin(request)
  if (!user) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  // Récupérer justificatif_url avant suppression
  const { data: charge } = await admin.from('charges').select('justificatif_url').eq('id', id).single()

  if (charge?.justificatif_url) {
    // Extraire le path depuis l'URL signée
    try {
      const url = new URL(charge.justificatif_url)
      const match = url.pathname.match(/\/object\/sign\/justificatifs\/(.+)/)
      if (match) {
        await admin.storage.from('justificatifs').remove([decodeURIComponent(match[1].split('?')[0])])
      }
    } catch {}
  }

  const { error } = await admin.from('charges').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
