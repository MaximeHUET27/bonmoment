/**
 * POST /api/push/notify-reservation
 * Appelée par le client (useReservation) juste après une réservation réussie.
 * Notifie le commerçant qu'un bon a été réservé.
 *
 * Body JSON : { offre_id: string }
 */
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { sendPush } from '@/lib/push'
import { NextResponse } from 'next/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

export async function POST(request) {
  /* Auth utilisateur — doit être connecté (le client qui réserve) */
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const { offre_id } = await request.json()
  if (!offre_id) return NextResponse.json({ error: 'offre_id manquant' }, { status: 400 })

  /* Récupère l'offre + le commerce + l'owner_id */
  const { data: offre } = await admin
    .from('offres')
    .select('id, titre, commerces(id, nom, owner_id)')
    .eq('id', offre_id)
    .maybeSingle()

  if (!offre?.commerces) return NextResponse.json({ envoyes: 0 })

  const ownerId = offre.commerces.owner_id

  /* Récupère le nom du réservant */
  const { data: reservant } = await admin
    .from('users')
    .select('nom')
    .eq('id', user.id)
    .maybeSingle()

  const prenomReservant = reservant?.nom?.split(' ')?.[0] || 'Un client'

  /* Récupère l'abonnement push du commerçant */
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', ownerId)

  if (!subs?.length) return NextResponse.json({ envoyes: 0 })

  let envoyes = 0
  for (const sub of subs) {
    const ok = await sendPush(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      {
        title: `🎉 Nouvelle réservation — ${offre.commerces.nom}`,
        body:  `${prenomReservant} vient de réserver "${offre.titre}"`,
        url:   `/commercant/dashboard`,
      },
    )
    if (ok) {
      envoyes++
    } else {
      // Abonnement expiré → suppression
      await admin.from('push_subscriptions').delete().eq('id', sub.id)
    }
  }

  return NextResponse.json({ envoyes })
}
