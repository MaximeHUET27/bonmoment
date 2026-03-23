import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const QUOTA_PAR_PALIER = { decouverte: 4, essentiel: 8, pro: 16 }

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  /* ── Auth ────────────────────────────────────────────────────────────── */
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  /* ── Body ── */
  const body = await request.json()

  /* ── Commerce — vérifié par ID + owner_id (fix multi-commerce) ───────── */
  const commerceId = body.commerce_id
  if (!commerceId)
    return NextResponse.json({ error: 'commerce_id manquant' }, { status: 400 })

  const { data: commerce, error: commerceErr } = await admin
    .from('commerces')
    .select('id, palier')
    .eq('id', commerceId)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (commerceErr || !commerce)
    return NextResponse.json({ error: 'Commerce introuvable' }, { status: 403 })

  /* ── Vérification quota ──────────────────────────────────────────────── */
  const palier    = commerce.palier || 'decouverte'
  const limite    = QUOTA_PAR_PALIER[palier] ?? 4
  const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const { count } = await admin
    .from('offres')
    .select('id', { count: 'exact', head: true })
    .eq('commerce_id', commerce.id)
    .gte('created_at', debutMois)

  if ((count ?? 0) >= limite) {
    return NextResponse.json(
      { error: "Quota d'offres atteint pour ce mois." },
      { status: 403 }
    )
  }

  /* ── Insertion ───────────────────────────────────────────────────────── */
  const { error: insertErr } = await admin.from('offres').insert({
    commerce_id:      commerce.id,
    type_remise:      body.type_remise,
    valeur:           body.valeur ?? null,
    titre:            body.titre,
    nb_bons_total:    body.nb_bons_total ?? null,
    nb_bons_restants: body.nb_bons_restants,
    date_debut:       body.date_debut,
    date_fin:         body.date_fin,
    statut:           'active',
    est_recurrente:   body.est_recurrente ?? false,
    jours_recurrence: body.jours_recurrence ?? null,
  })

  if (insertErr) {
    console.error('Erreur insertion offre:', insertErr.message)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
