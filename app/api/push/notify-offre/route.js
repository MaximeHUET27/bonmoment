/**
 * POST /api/push/notify-offre
 * Appelée par le client juste après la création d'une offre.
 * Notifie les users qui ont ce commerce dans leurs favoris (commerces_abonnes).
 *
 * Body JSON : { commerce_id: string, offre_titre: string, offre_id: string }
 */
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToMany } from '@/lib/push'
import { NextResponse } from 'next/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

export async function POST(request) {
  /* Auth utilisateur — doit être connecté (le commerçant) */
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const { commerce_id, offre_titre, offre_id } = await request.json()
  if (!commerce_id || !offre_titre) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  /* Vérifie que le commerce appartient bien à cet utilisateur */
  const { data: commerce } = await admin
    .from('commerces')
    .select('id, nom, ville')
    .eq('id', commerce_id)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!commerce) return NextResponse.json({ error: 'Commerce introuvable' }, { status: 403 })

  /* Trouve les users qui ont ce commerce en favori */
  const { data: abonnes } = await admin
    .from('users')
    .select('id')
    .contains('commerces_abonnes', [commerce_id])

  if (!abonnes?.length) return NextResponse.json({ envoyes: 0 })

  const userIds = abonnes.map(u => u.id)

  /* Récupère leurs abonnements push */
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', userIds)

  if (!subs?.length) return NextResponse.json({ envoyes: 0 })

  const url = offre_id ? `/offre/${offre_id}` : `/?ville=${encodeURIComponent(commerce.ville)}`

  const envoyes = await sendPushToMany(
    subs,
    {
      title: `🔥 Nouvelle offre — ${commerce.nom}`,
      body:  offre_titre,
      url,
    },
    admin,
  )

  return NextResponse.json({ envoyes, total: subs.length })
}
