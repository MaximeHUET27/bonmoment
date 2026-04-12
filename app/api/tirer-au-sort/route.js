/**
 * POST /api/tirer-au-sort
 * Body: { offre_id: string }
 * Tire au sort un gagnant parmi les bons validés physiquement (statut = 'utilisee').
 * Retourne : { success, gagnant: { id, prenom, nom, email }, participants: [{ id, nom }] }
 */

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

const checkRate = rateLimit({ maxRequests: 3, windowMs: 60 * 1000 })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const limited = checkRate(request)
  if (limited) return limited

  /* ── Auth ─────────────────────────────────────────────────────────────── */
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  /* ── Paramètre ────────────────────────────────────────────────────────── */
  const { offre_id } = await request.json().catch(() => ({}))
  if (!offre_id) return NextResponse.json({ error: 'offre_id manquant' }, { status: 400 })

  /* ── Offre + commerce en une seule requête ────────────────────────────── */
  // Fix : on résout le commerce via l'offre (évite le problème multi-commerces par owner_id)
  const { data: offre } = await admin
    .from('offres')
    .select('id, commerce_id, titre, type_remise, statut, date_fin, gagnant_id, commerces(id, nom, adresse, ville, telephone, owner_id)')
    .eq('id', offre_id)
    .maybeSingle()

  if (!offre)
    return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 })

  if (offre.commerces?.owner_id !== user.id)
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  if (offre.type_remise !== 'concours')
    return NextResponse.json({ error: "Ce n'est pas un concours" }, { status: 400 })

  const estExpiree = offre.statut === 'expiree' || new Date(offre.date_fin) < new Date()
  if (!estExpiree)
    return NextResponse.json({ error: "L'offre n'est pas encore expirée" }, { status: 400 })

  if (offre.gagnant_id)
    return NextResponse.json({ error: 'Le tirage a déjà eu lieu' }, { status: 409 })

  /* Mise à jour du statut en BDD si date_fin passée mais statut pas encore 'expiree' */
  if (offre.statut !== 'expiree') {
    await admin.from('offres').update({ statut: 'expiree' }).eq('id', offre_id)
  }

  const commerce = offre.commerces

  /* ── Participants (bons validés physiquement) ─────────────────────────── */
  const { data: reservations } = await admin
    .from('reservations')
    .select('id, user_id')
    .eq('offre_id', offre_id)
    .eq('statut', 'utilisee')

  if (!reservations?.length)
    return NextResponse.json({ error: 'Aucun participant validé physiquement' }, { status: 404 })

  /* Récupère les noms de tous les participants en une seule requête */
  const userIds = [...new Set(reservations.map(r => r.user_id))]
  const { data: usersData } = await admin
    .from('users')
    .select('id, nom, email')
    .in('id', userIds)

  const usersMap = Object.fromEntries((usersData || []).map(u => [u.id, u]))

  const participants = reservations.map(r => ({
    id:  r.user_id,
    nom: usersMap[r.user_id]?.nom ?? 'Participant',
  }))

  /* ── Tirage aléatoire (CSPRNG) ───────────────────────────────────────── */
  const randomIndex = new Uint32Array(1)
  globalThis.crypto.getRandomValues(randomIndex)
  const gagnantRes  = reservations[randomIndex[0] % reservations.length]
  const gagnantUser = usersMap[gagnantRes.user_id]

  /* ── Stocker le gagnant ───────────────────────────────────────────────── */
  const { error: updateErr } = await admin
    .from('offres')
    .update({ gagnant_id: gagnantUser?.id ?? gagnantRes.user_id })
    .eq('id', offre_id)

  if (updateErr)
    return NextResponse.json({ error: 'Erreur lors de l\'enregistrement du gagnant' }, { status: 500 })

  return NextResponse.json({
    success:            true,
    total_participants: reservations.length,
    participants,
    gagnant: {
      id:     gagnantUser?.id     ?? gagnantRes.user_id,
      prenom: gagnantUser?.nom?.split(' ')[0] ?? 'Gagnant',
      nom:    gagnantUser?.nom    ?? 'Gagnant',
      email:  gagnantUser?.email  ?? null,
    },
  })
}
