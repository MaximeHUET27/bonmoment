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
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:24px 16px;">

    <!-- Header orange -->
    <div style="background:linear-gradient(135deg,#FF6B00,#FFD700);border-radius:20px 20px 0 0;padding:40px 32px;text-align:center;">
      <p style="margin:0;color:rgba(255,255,255,0.9);font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">BONMOMENT</p>
      <div style="font-size:64px;margin:16px 0 8px;">🎉</div>
      <h1 style="margin:0;color:white;font-size:28px;font-weight:900;line-height:1.2;">
        Félicitations ${prenom}&nbsp;!
      </h1>
      <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:15px;">Tu as remporté le concours !</p>
    </div>

    <!-- Corps -->
    <div style="background:white;padding:32px;border-radius:0 0 20px 20px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9CA3AF;">Tu as gagné</p>
      <p style="margin:0 0 24px;font-size:22px;font-weight:900;color:#FF6B00;">${offre.titre}</p>

      <div style="background:#FFF0E0;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#0A0A0A;">${commerce.nom}</p>
        ${adresse ? `<p style="margin:0 0 4px;font-size:13px;color:#3D3D3D;">📍 ${adresse}</p>` : ''}
        ${commerce.telephone ? `<p style="margin:0;font-size:13px;color:#3D3D3D;">📞 ${commerce.telephone}</p>` : ''}
      </div>

      <p style="font-size:14px;color:#3D3D3D;line-height:1.6;margin:0 0 24px;">
        Présente-toi chez <strong>${commerce.nom}</strong> pour récupérer ton lot.
        Montre cet email ou ton bon BONMOMENT à l'accueil.
      </p>

      <div style="text-align:center;">
        <a href="https://bonmoment.app"
          style="display:inline-block;background:#FF6B00;color:white;font-weight:700;font-size:14px;padding:16px 32px;border-radius:14px;text-decoration:none;">
          Voir mes bons →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px 0 0;color:#9CA3AF;font-size:11px;">
      <p style="margin:0;">BONMOMENT — Soyez là au bon moment</p>
    </div>

  </div>
</body>
</html>`
}
