/**
 * POST /api/valider-bon
 * Body: { reservation_id?: string } | { code_validation?: string }
 *
 * SQL requis si les colonnes n'existent pas encore :
 *   ALTER TABLE reservations ADD COLUMN IF NOT EXISTS utilise_at TIMESTAMPTZ;
 *   ALTER TABLE offres       ADD COLUMN IF NOT EXISTS gagnant_id UUID REFERENCES users(id);
 */

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

const checkRate = rateLimit({ maxRequests: 30, windowMs: 60 * 1000 })

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

  /* ── Commerce du commerçant connecté ──────────────────────────────────── */
  const { data: commerce } = await admin
    .from('commerces')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!commerce) return NextResponse.json({ error: 'Commerce introuvable' }, { status: 403 })

  /* ── Paramètres ───────────────────────────────────────────────────────── */
  const body = await request.json().catch(() => ({}))
  const { reservation_id, code_validation } = body
  if (!reservation_id && !code_validation)
    return NextResponse.json({ error: 'Paramètre manquant' }, { status: 400 })

  /* ── Chercher la réservation ──────────────────────────────────────────── */
  let q = admin
    .from('reservations')
    .select(`
      id, statut, utilise_at, code_validation, user_id,
      offres!inner(id, commerce_id, statut, date_fin, type_remise, titre, valeur)
    `)

  if (reservation_id) q = q.eq('id', reservation_id)
  else                q = q.eq('code_validation', code_validation)

  const { data: res, error: fetchErr } = await q.maybeSingle()

  if (fetchErr || !res)
    return NextResponse.json({ error: 'Code invalide' }, { status: 404 })

  const offre = res.offres

  /* ── Vérifications dans l'ordre ───────────────────────────────────────── */

  // 1. Appartient au commerce du commerçant ?
  if (offre.commerce_id !== commerce.id)
    return NextResponse.json({ error: "Ce bon n'est pas pour ton commerce" }, { status: 403 })

  // 2. Déjà utilisé ?
  if (res.statut === 'utilisee')
    return NextResponse.json(
      { error: 'Ce bon a déjà été utilisé', utilise_at: res.utilise_at },
      { status: 409 }
    )

  // 3. Offre expirée ?
  const now = new Date()
  if (offre.statut !== 'active' || new Date(offre.date_fin) < now)
    return NextResponse.json({ error: 'Cette offre est expirée' }, { status: 410 })

  // 4. Bon périmé ?
  if (res.statut === 'expiree')
    return NextResponse.json({ error: 'Ce bon est périmé' }, { status: 410 })

  /* ── Marquer comme utilisé ────────────────────────────────────────────── */
  const { error: updateErr } = await admin
    .from('reservations')
    .update({ statut: 'utilisee', utilise_at: now.toISOString() })
    .eq('id', res.id)

  if (updateErr) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

  /* ── Prénom du client ─────────────────────────────────────────────────── */
  let prenom = null
  if (res.user_id) {
    const { data: u } = await admin
      .from('users').select('nom').eq('id', res.user_id).maybeSingle()
    prenom = u?.nom?.split(' ')[0] ?? null
  }

  return NextResponse.json({
    success: true,
    offre:  { titre: offre.titre, type_remise: offre.type_remise, valeur: offre.valeur },
    client: { prenom },
  })
}
