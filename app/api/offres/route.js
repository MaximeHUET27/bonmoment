import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { sendPushToMany } from '@/lib/push'

const QUOTA_PAR_PALIER = { decouverte: 4, essentiel: 8, pro: 16 }

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const checkRate = rateLimit({ maxRequests: 20, windowMs: 10 * 60 * 1000 })

export async function POST(request) {
  const limited = checkRate(request)
  if (limited) return limited

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
    .select('id, nom, ville, palier')
    .eq('id', commerceId)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (commerceErr || !commerce)
    return NextResponse.json({ error: 'Commerce introuvable' }, { status: 403 })

  /* ── Vérification dates ──────────────────────────────────────────────── */
  const now = new Date()
  if (body.date_fin && new Date(body.date_fin) <= now) {
    return NextResponse.json({ error: 'Impossible de publier une offre déjà expirée' }, { status: 400 })
  }
  if (body.date_debut && new Date(body.date_debut) < new Date(now.getTime() - 5 * 60 * 1000)) {
    return NextResponse.json({ error: "L'heure de début est dans le passé" }, { status: 400 })
  }

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
  const { data: inserted, error: insertErr } = await admin.from('offres').insert({
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
  }).select('id').single()

  if (insertErr) {
    console.error('Erreur insertion offre:', insertErr.message)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  /* ── Notification push non-bloquante aux abonnés du commerce ── */
  ;(async () => {
    try {
      const { data: abonnes } = await admin
        .from('users')
        .select('id')
        .contains('commerces_abonnes', [commerce.id])

      if (!abonnes?.length) return

      const { data: subs } = await admin
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .in('user_id', abonnes.map(u => u.id))

      if (!subs?.length) return

      const offreUrl = `/offre/${inserted.id}`
      await sendPushToMany(
        subs,
        { title: `🔥 Nouvelle offre — ${commerce.nom}`, body: body.titre, url: offreUrl },
        admin,
      )
    } catch (e) {
      console.error('[push/offre]', e.message)
    }
  })()

  /* ── Mail Push — email instantané aux abonnés (non-bloquant) ── */
  ;(async () => {
    try {
      const offreTitre = body.titre || ''
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://bonmoment.app'}/api/email-push`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({
          commerce_id:    commerce.id,
          commerce_nom:   commerce.nom,
          commerce_ville: commerce.ville,
          offre_id:       inserted.id,
          offre_titre:    offreTitre,
          offre_type:     body.type_remise,
          offre_valeur:   body.valeur ?? null,
          offre_date_fin: body.date_fin,
        }),
      })
    } catch (err) {
      console.error('[email-push/offre]', err.message)
    }
  })()

  return NextResponse.json({ success: true, id: inserted.id })
}
