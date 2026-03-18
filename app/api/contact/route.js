import { NextResponse } from 'next/server'

const BREVO_API_KEY = process.env.BREVO_API_KEY
const TO_EMAIL      = 'bonmomentapp@gmail.com'
const TO_NAME       = 'Équipe BONMOMENT'

export async function POST(req) {
  try {
    const { prenom, email, profil, message } = await req.json()

    if (!prenom || !email || !message) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    const emailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#FF6B00;padding:24px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:22px;">📧 Nouveau message via BON'Aide</h1>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #F0F0F0;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;width:120px;font-size:13px;font-weight:700;color:#9CA3AF;text-transform:uppercase;">Prénom</td>
              <td style="padding:8px 0;font-size:14px;color:#0A0A0A;font-weight:600;">${prenom}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:13px;font-weight:700;color:#9CA3AF;text-transform:uppercase;">Email</td>
              <td style="padding:8px 0;font-size:14px;color:#0A0A0A;font-weight:600;">
                <a href="mailto:${email}" style="color:#FF6B00;">${email}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:13px;font-weight:700;color:#9CA3AF;text-transform:uppercase;">Profil</td>
              <td style="padding:8px 0;font-size:14px;color:#0A0A0A;font-weight:600;">
                ${profil === 'commercant' ? 'Commerçant 🏪' : 'Habitant 🏠'}
              </td>
            </tr>
          </table>
          <hr style="border:none;border-top:1px solid #F0F0F0;margin:16px 0;" />
          <p style="font-size:13px;font-weight:700;color:#9CA3AF;text-transform:uppercase;margin:0 0 8px;">Message</p>
          <p style="font-size:14px;color:#0A0A0A;line-height:1.6;white-space:pre-wrap;margin:0;">${message}</p>
        </div>
        <div style="background:#F5F5F5;padding:16px;border-radius:0 0 12px 12px;text-align:center;">
          <p style="font-size:11px;color:#9CA3AF;margin:0;">BONMOMENT · bonmoment.app</p>
        </div>
      </div>
    `

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
