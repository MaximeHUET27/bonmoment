import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

const BREVO_API_KEY = process.env.BREVO_API_KEY
const checkRate = rateLimit({ maxRequests: 5, windowMs: 15 * 60 * 1000 })
const TO_EMAIL      = 'bonmomentapp@gmail.com'
const TO_NAME       = 'Équipe BONMOMENT'

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function POST(req) {
  const limited = checkRate(req)
  if (limited) return limited

  try {
    const { prenom, email, profil, message } = await req.json()

    if (!prenom || !email || !message) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    if (prenom.length > 100 || email.length > 320 || message.length > 5000) {
      return NextResponse.json({ error: 'Contenu trop long' }, { status: 400 })
    }

    const safePrenom  = escapeHtml(prenom)
    const safeEmail   = escapeHtml(email)
    const safeMessage = escapeHtml(message)

    const emailHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F5F5F5;">

<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#F5F5F5" style="background:#F5F5F5;padding:20px 0;">
<tr><td align="center" style="padding:20px 16px;">

<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

  <tr><td style="background:#FF6B00;padding:28px 24px;text-align:center;">
    <span style="font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;color:#FFFFFF;letter-spacing:2px;">BONMOMENT</span>
    <div style="font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:rgba(255,255,255,0.92);margin-top:8px;">📧 Nouveau message via BON'Aide</div>
  </td></tr>

  <tr><td style="padding:32px 28px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:15px;color:#3D3D3D;line-height:1.7;">

    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #F0F0F0;margin-bottom:24px;">
      <tr style="background:#FAFAFA;">
        <td style="padding:10px 16px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#9CA3AF;text-transform:uppercase;width:110px;">Prénom</td>
        <td style="padding:10px 16px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#0A0A0A;">${safePrenom}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#9CA3AF;text-transform:uppercase;">Email</td>
        <td style="padding:10px 16px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#0A0A0A;">
          <a href="mailto:${safeEmail}" style="color:#FF6B00;text-decoration:none;">${safeEmail}</a>
        </td>
      </tr>
      <tr style="background:#FAFAFA;">
        <td style="padding:10px 16px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#9CA3AF;text-transform:uppercase;">Profil</td>
        <td style="padding:10px 16px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#0A0A0A;">
          ${profil === 'commercant' ? 'Commerçant 🏪' : 'Habitant 🏠'}
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;">Message</p>
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#0A0A0A;line-height:1.6;white-space:pre-wrap;background:#F9F9F9;border-radius:8px;padding:16px;">${safeMessage}</p>

  </td></tr>

  <tr><td style="padding:0 28px;">
    <div style="border-top:1px solid #F0F0F0;"></div>
  </td></tr>

  <tr><td style="padding:20px 28px;text-align:center;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:12px;color:#999999;line-height:1.6;">
    L'équipe BONMOMENT · bonmoment.app
  </td></tr>

</table>
</td></tr>
</table>

</body>
</html>`

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key':     BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender:   { name: 'BONMOMENT', email: 'bonmomentapp@gmail.com' },
        to:       [{ email: TO_EMAIL, name: TO_NAME }],
        replyTo:  { email, name: prenom },
        subject:  `[BON'Aide] Nouveau message de ${prenom} (${profil})`,
        htmlContent: emailHtml,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Brevo error:', err)
      return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Contact API error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
