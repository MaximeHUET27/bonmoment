import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BREVO_API_KEY = process.env.BREVO_API_KEY
const checkRate = rateLimit({ maxRequests: 10, windowMs: 5 * 60 * 1000 })

export async function POST(request) {
  const limited = checkRate(request)
  if (limited) return limited

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { reservation_id, commerce_id, note, commentaire, source = 'bon' } = body

  if (!commerce_id || !note) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const { error } = await admin
    .from('feedbacks_commerce')
    .insert({ reservation_id: reservation_id || null, commerce_id, user_id: user.id, note, commentaire: commentaire || null, source })

  if (error) {
    console.error('[feedback-commerce] insert error:', error.message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  /* Envoyer un email au commerçant via Brevo */
  try {
    const { data: commerce } = await admin
      .from('commerces')
      .select('nom, owner_id')
      .eq('id', commerce_id)
      .single()

    if (commerce?.owner_id) {
      const { data: owner } = await admin
        .from('users')
        .select('email')
        .eq('id', commerce.owner_id)
        .single()

      if (owner?.email) {
        const etoiles = '⭐'.repeat(note) + '☆'.repeat(5 - note)
        const commentaireHtml = commentaire
          ? `<p style="margin:12px 0 0;font-size:14px;color:#3D3D3D;"><strong>Commentaire :</strong> ${commentaire.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
          : '<p style="margin:12px 0 0;font-size:14px;color:#9CA3AF;"><em>Aucun commentaire laissé.</em></p>'

        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': BREVO_API_KEY,
          },
          body: JSON.stringify({
            sender: { name: 'BONMOMENT', email: 'bonmomentapp@gmail.com' },
            to: [{ email: owner.email }],
            subject: `💬 Nouveau retour client — ${note}/5 étoiles`,
            htmlContent: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F5F5F5;">

<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">💬 Nouveau retour client — ${note}/5 étoiles — ${commerce.nom}</div>

<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#F5F5F5" style="background:#F5F5F5;padding:20px 0;">
<tr><td align="center" style="padding:20px 16px;">

<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

  <tr><td style="background:#FF6B00;padding:28px 24px;text-align:center;">
    <span style="font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;color:#FFFFFF;letter-spacing:2px;">BONMOMENT</span>
    <div style="font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:rgba(255,255,255,0.92);margin-top:8px;">💬 Nouveau retour client — ${commerce.nom}</div>
  </td></tr>

  <tr><td style="padding:32px 28px 8px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:15px;color:#3D3D3D;line-height:1.7;">

    <p style="margin:0 0 16px;">Un client a laissé un retour sur ton commerce :</p>

    <div style="background:#FFF7ED;border-left:4px solid #FF6B00;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0;font-size:24px;">${etoiles}</p>
      <p style="margin:6px 0 0;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#FF6B00;">Note : ${note}/5</p>
      ${commentaireHtml}
    </div>

    <p style="margin:0;font-size:12px;color:#9CA3AF;">Ce retour est privé — il ne sera pas publié publiquement.</p>

  </td></tr>

  <tr><td style="padding:20px 28px 32px;text-align:center;">
    <a href="https://bonmoment.app/commercant/dashboard"
       style="display:inline-block;background:#FF6B00;color:#FFFFFF;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;box-shadow:0 2px 4px rgba(255,107,0,0.3);">
      Voir mon tableau de bord →
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
</html>`,
          }),
        })
      }
    }
  } catch (emailErr) {
    console.error('[feedback-commerce] email error:', emailErr)
    // Ne pas faire échouer la requête si l'email plante
  }

  return NextResponse.json({ success: true })
}
