/**
 * POST /api/tirer-au-sort
 * Body: { offre_id: string }
 * Tire au sort un gagnant parmi les bons validés physiquement (statut = 'utilisee').
 */

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  /* ── Auth ─────────────────────────────────────────────────────────────── */
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  /* ── Commerce ─────────────────────────────────────────────────────────── */
  const { data: commerce } = await admin
    .from('commerces')
    .select('id, nom, adresse, ville')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!commerce) return NextResponse.json({ error: 'Commerce introuvable' }, { status: 403 })

  /* ── Paramètre ────────────────────────────────────────────────────────── */
  const { offre_id } = await request.json().catch(() => ({}))
  if (!offre_id) return NextResponse.json({ error: 'offre_id manquant' }, { status: 400 })

  /* ── Vérifier l'offre ─────────────────────────────────────────────────── */
  const { data: offre } = await admin
    .from('offres')
    .select('id, commerce_id, titre, type_remise, statut, gagnant_id')
    .eq('id', offre_id)
    .maybeSingle()

  if (!offre || offre.commerce_id !== commerce.id)
    return NextResponse.json({ error: 'Offre introuvable' }, { status: 403 })

  if (offre.type_remise !== 'concours')
    return NextResponse.json({ error: "Ce n'est pas un concours" }, { status: 400 })

  if (offre.statut !== 'expiree')
    return NextResponse.json({ error: "L'offre n'est pas encore expirée" }, { status: 400 })

  if (offre.gagnant_id)
    return NextResponse.json({ error: 'Le tirage a déjà eu lieu' }, { status: 409 })

  /* ── Participants (bons validés physiquement) ─────────────────────────── */
  const { data: reservations } = await admin
    .from('reservations')
    .select('id, user_id')
    .eq('offre_id', offre_id)
    .eq('statut', 'utilisee')

  if (!reservations?.length)
    return NextResponse.json({ error: 'Aucun participant validé physiquement' }, { status: 404 })

  /* ── Tirage aléatoire ─────────────────────────────────────────────────── */
  const gagnantRes = reservations[Math.floor(Math.random() * reservations.length)]

  const { data: gagnantUser } = await admin
    .from('users')
    .select('id, nom, email')
    .eq('id', gagnantRes.user_id)
    .maybeSingle()

  /* ── Stocker le gagnant ───────────────────────────────────────────────── */
  await admin
    .from('offres')
    .update({ gagnant_id: gagnantUser.id })
    .eq('id', offre_id)

  /* ── Email au gagnant via Brevo ───────────────────────────────────────── */
  if (gagnantUser?.email) {
    const prenom   = gagnantUser.nom?.split(' ')[0] ?? 'toi'
    const adresse  = [commerce.adresse, commerce.ville].filter(Boolean).join(', ')

    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender:      { name: 'BONMOMENT', email: 'bonmomentapp@gmail.com' },
        to:          [{ email: gagnantUser.email }],
        subject:     `🎉 Tu as gagné "${offre.titre}" chez ${commerce.nom} !`,
        htmlContent: buildEmailGagnant({ prenom, offre, commerce, adresse }),
      }),
    })
  }

  return NextResponse.json({
    success:           true,
    total_participants: reservations.length,
    gagnant: {
      id:     gagnantUser.id,
      prenom: gagnantUser.nom?.split(' ')[0] ?? 'Gagnant',
      nom:    gagnantUser.nom,
      email:  gagnantUser.email,
    },
  })
}

/* ── Template email ────────────────────────────────────────────────────── */

function buildEmailGagnant({ prenom, offre, commerce, adresse }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:24px 16px;">
    <div style="background:linear-gradient(135deg,#FF6B00,#FFD700);border-radius:20px 20px 0 0;padding:40px 32px;text-align:center;">
      <p style="margin:0;color:rgba(255,255,255,0.9);font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">BONMOMENT</p>
      <div style="font-size:64px;margin:16px 0 8px;">🎉</div>
      <h1 style="margin:0;color:white;font-size:28px;font-weight:900;line-height:1.2;">
        Félicitations ${prenom} !
      </h1>
      <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:15px;">Tu as remporté le concours !</p>
    </div>
    <div style="background:white;padding:32px;border-radius:0 0 20px 20px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9CA3AF;">Tu as gagné</p>
      <p style="margin:0 0 24px;font-size:22px;font-weight:900;color:#FF6B00;">${offre.titre}</p>

      <div style="background:#FFF0E0;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#0A0A0A;">${commerce.nom}</p>
        ${adresse ? `<p style="margin:0;font-size:13px;color:#3D3D3D;">📍 ${adresse}</p>` : ''}
      </div>

      <p style="font-size:14px;color:#3D3D3D;line-height:1.6;margin:0 0 24px;">
        Présente-toi chez <strong>${commerce.nom}</strong> pour récupérer ton lot.
        Montre cet email ou ton bon BONMOMENT à l'accueil.
      </p>

      <div style="text-align:center;">
        <a href="https://bonmoment.app" style="display:inline-block;background:#FF6B00;color:white;font-weight:700;font-size:14px;padding:16px 32px;border-radius:14px;text-decoration:none;">
          Voir mes bons →
        </a>
      </div>
    </div>
    <div style="text-align:center;padding:20px 0 0;color:#9CA3AF;font-size:11px;">
      <p style="margin:0;">BONMOMENT — Soyez là au bon moment</p>
    </div>
  </div>
</body>
</html>`
}
