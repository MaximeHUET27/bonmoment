/**
 * POST /api/admin/email-gagnant
 * Body: { offre_id: string }
 * Envoie un email au gagnant d'un concours via Brevo.
 * Réservé au commerçant propriétaire de l'offre.
 */

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  /* ── Auth ── */
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  /* ── Paramètre ── */
  const { offre_id } = await request.json().catch(() => ({}))
  if (!offre_id) return NextResponse.json({ error: 'offre_id manquant' }, { status: 400 })

  /* ── Offre + commerce ── */
  const { data: offre } = await admin
    .from('offres')
    .select('id, titre, gagnant_id, commerces(id, nom, adresse, ville, telephone, owner_id)')
    .eq('id', offre_id)
    .maybeSingle()

  if (!offre)
    return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 })

  if (offre.commerces?.owner_id !== user.id)
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  if (!offre.gagnant_id)
    return NextResponse.json({ error: 'Aucun gagnant enregistré' }, { status: 400 })

  /* ── Gagnant ── */
  const { data: gagnantUser } = await admin
    .from('users')
    .select('id, nom, email')
    .eq('id', offre.gagnant_id)
    .maybeSingle()

  if (!gagnantUser?.email)
    return NextResponse.json({ error: 'Email du gagnant introuvable' }, { status: 404 })

  const commerce = offre.commerces
  const prenom   = gagnantUser.nom?.split(' ')[0] ?? 'toi'
  const adresse  = [commerce.adresse, commerce.ville].filter(Boolean).join(', ')

  /* ── Envoi Brevo ── */
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
    body: JSON.stringify({
      sender:      { name: 'BONMOMENT', email: 'bonmomentapp@gmail.com' },
      to:          [{ email: gagnantUser.email }],
      subject:     `🎉 Tu as gagné "${offre.titre}" chez ${commerce.nom} !`,
      htmlContent: buildEmailGagnant({ prenom, offre, commerce, adresse }),
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Brevo error:', err)
    return NextResponse.json({ error: 'Échec envoi email' }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}

/* ── Template email charte BONMOMENT ─────────────────────────────────────── */

function buildEmailGagnant({ prenom, offre, commerce, adresse }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Tu as gagné "${offre.titre}" !</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F5F5F5;">

<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">🎉 Félicitations ${prenom} ! Tu as remporté le concours chez ${commerce.nom} !</div>

<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#F5F5F5" style="background:#F5F5F5;padding:20px 0;">
<tr><td align="center" style="padding:20px 16px;">

<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

  <tr><td style="background:#FF6B00;padding:32px 24px;text-align:center;">
    <span style="font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;color:#FFFFFF;letter-spacing:2px;">BONMOMENT</span>
    <div style="font-size:48px;line-height:1;margin:12px 0 8px;">🎉</div>
    <div style="font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:24px;font-weight:900;color:#FFFFFF;line-height:1.2;">Félicitations ${prenom}&nbsp;!</div>
    <div style="font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:15px;color:rgba(255,255,255,0.92);margin-top:6px;">Tu as remporté le concours !</div>
  </td></tr>

  <tr><td style="padding:32px 28px 8px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;color:#3D3D3D;line-height:1.7;">

    <p style="margin:0 0 4px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9CA3AF;">Tu as gagné</p>
    <p style="margin:0 0 24px;font-size:22px;font-weight:900;color:#FF6B00;">${offre.titre}</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#FFF0E0;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 4px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#0A0A0A;">${commerce.nom}</p>
        ${adresse ? `<p style="margin:0;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:13px;color:#3D3D3D;">📍 ${adresse}</p>` : ''}
      </td></tr>
    </table>

    <p style="margin:0 0 24px;font-size:14px;color:#3D3D3D;line-height:1.6;">
      Présente-toi chez <strong>${commerce.nom}</strong> pour récupérer ton lot.
      Montre cet email ou ton bon BONMOMENT à l'accueil.
    </p>

  </td></tr>

  <tr><td style="padding:0 28px 32px;text-align:center;">
    <a href="https://bonmoment.app"
       style="display:inline-block;background:#FF6B00;color:#FFFFFF;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;box-shadow:0 2px 4px rgba(255,107,0,0.3);">
      Voir mes bons →
    </a>
  </td></tr>

  <tr><td style="padding:0 28px;">
    <div style="border-top:1px solid #F0F0F0;"></div>
  </td></tr>

  <tr><td style="padding:20px 28px;text-align:center;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:12px;color:#999999;line-height:1.6;">
    L'équipe BONMOMENT<br>
    <a href="mailto:bonmomentapp@gmail.com" style="color:#999999;text-decoration:none;">bonmomentapp@gmail.com</a>
  </td></tr>

</table>
</td></tr>
</table>

</body>
</html>`
}
