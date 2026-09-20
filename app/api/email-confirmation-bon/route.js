import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { BREVO_SENDER, BREVO_REPLY_TO } from '@/lib/brevo/sender'
import { signerAnnulation } from '@/lib/emailLinks'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://bonmoment.app'

const checkRate = rateLimit({ maxRequests: 20, windowMs: 60 * 1000 })

function labelRemise(type_remise, valeur) {
  switch (type_remise) {
    case 'pourcentage':    return `-${valeur}%`
    case 'montant_fixe':
    case 'montant':        return `-${valeur}€`
    case 'cadeau':         return '🎁 Cadeau'
    case 'produit_offert': return '📦 Produit offert'
    case 'service_offert': return '✂️ Service offert'
    case 'concours':       return '🎰 Concours'
    case 'atelier':        return '🎉 Évènement'
    case 'fidelite':       return '⭐ Fidélité'
    default:               return 'Offre'
  }
}

function formatCode(code) {
  const s = String(code ?? '').padStart(6, '0')
  return `${s.slice(0, 3)} ${s.slice(3)}`
}

function heureFr(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
  })
}

function buildHtml({ prenom, commerce, badge, offreTitre, heureFin, code, qrImgUrl, bonUrl, annulerUrl }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F5F5F5;">

<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Ton bon chez ${commerce} est confirmé — code ${code}</div>

<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#F5F5F5" style="background:#F5F5F5;padding:20px 0;">
<tr><td align="center" style="padding:20px 16px;">

<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

  <tr><td style="background:#FF6B00;padding:28px 24px;text-align:center;">
    <span style="font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;color:#FFFFFF;letter-spacing:2px;">BONMOMENT</span>
    <div style="font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;color:rgba(255,255,255,0.92);margin-top:8px;">✅ Ton bon est confirmé</div>
  </td></tr>

  <tr><td style="padding:32px 28px 8px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;color:#3D3D3D;line-height:1.7;text-align:center;">
    <p style="margin:0 0 4px;">Salut ${prenom} ! 👋</p>
    <p style="margin:0 0 24px;font-size:15px;">Ton bon chez <strong>${commerce}</strong> est réservé.</p>

    <div style="background:#FFF8F0;border-left:4px solid #FF6B00;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:18px;font-weight:800;color:#FF6B00;">${badge} — ${offreTitre}</p>
      <img src="${qrImgUrl}" alt="QR code du bon" width="200" height="200" style="display:block;margin:0 auto 16px;border-radius:8px;" />
      <p style="margin:0;font-family:'Courier New',monospace;font-size:28px;letter-spacing:2px;color:#0A0A0A;">${code}</p>
      <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#999999;">Présente le QR ou ce code avant ${heureFin}</p>
    </div>

    <a href="${bonUrl}"
       style="display:inline-block;background:#FF6B00;color:#FFFFFF;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;box-shadow:0 2px 4px rgba(255,107,0,0.3);margin-bottom:16px;">
      Voir mon bon →
    </a>

    <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#999999;">
      Tu ne pourras pas y aller ?
      <a href="${annulerUrl}" style="color:#FF6B00;font-weight:700;text-decoration:underline;">Libère ton bon pour un autre habitant</a>
    </p>
  </td></tr>

  <tr><td style="padding:0 28px;">
    <div style="border-top:1px solid #F0F0F0;"></div>
  </td></tr>

  <tr><td style="padding:20px 28px;text-align:center;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:12px;color:#999999;line-height:1.6;">
    L'équipe BONMOMENT<br>
    <a href="mailto:contact@bonmoment.app" style="color:#999999;text-decoration:none;">contact@bonmoment.app</a>
  </td></tr>

</table>
</td></tr>
</table>

</body>
</html>`
}

export async function POST(req) {
  const limited = checkRate(req)
  if (limited) return limited

  const { reservation_id } = await req.json().catch(() => ({}))
  if (!reservation_id) return Response.json({ error: 'Paramètre manquant' }, { status: 400 })

  /* ── Sécurité : seul le titulaire de la réservation peut déclencher son email ── */
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non connecté' }, { status: 401 })

  const { data: resa } = await admin
    .from('reservations')
    .select(`
      id, user_id, statut, code_validation, qr_code_data, confirmation_envoyee_at,
      offres ( titre, type_remise, valeur, date_fin, commerces ( nom, ville ) )
    `)
    .eq('id', reservation_id)
    .maybeSingle()

  if (!resa || resa.user_id !== user.id) {
    return Response.json({ error: 'Réservation introuvable' }, { status: 404 })
  }
  if (resa.confirmation_envoyee_at || resa.statut !== 'reservee') {
    return Response.json({ skipped: true })
  }

  const offre    = resa.offres
  const commerce = offre?.commerces
  if (!offre || !commerce || !user.email) {
    return Response.json({ error: 'Données incomplètes' }, { status: 422 })
  }

  const qrData    = resa.qr_code_data || `${SITE}/bon/${resa.id}`
  const qrImgUrl  = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(qrData)}`
  const bonUrl    = `${SITE}/bon/${resa.id}`
  const annulerUrl = `${SITE}/api/annuler-bon-email?r=${resa.id}&t=${signerAnnulation(resa.id)}`
  const prenom    = (user.user_metadata?.nom || user.user_metadata?.full_name || '').split(' ')[0] || 'Habitant'

  const html = buildHtml({
    prenom,
    commerce:   commerce.nom,
    badge:      labelRemise(offre.type_remise, offre.valeur),
    offreTitre: offre.titre,
    heureFin:   heureFr(offre.date_fin),
    code:       formatCode(resa.code_validation),
    qrImgUrl,
    bonUrl,
    annulerUrl,
  })

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method:  'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender:      BREVO_SENDER,
        to:          [{ email: user.email, name: prenom }],
        replyTo:     BREVO_REPLY_TO,
        subject:     `✅ Ton bon chez ${commerce.nom} est confirmé`,
        htmlContent: html,
      }),
    })
    if (!res.ok) throw new Error(`Brevo ${res.status}`)

    await admin
      .from('reservations')
      .update({ confirmation_envoyee_at: new Date().toISOString() })
      .eq('id', resa.id)

    return Response.json({ sent: true })
  } catch (err) {
    console.error('[email-confirmation-bon]', err.message)
    return Response.json({ error: 'Erreur envoi' }, { status: 500 })
  }
}
