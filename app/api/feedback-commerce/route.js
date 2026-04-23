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
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:'Montserrat',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#FF6B00;border-radius:16px 16px 0 0;padding:28px 24px;text-align:center;">
      <p style="margin:0;color:white;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">BONMOMENT</p>
      <h1 style="margin:10px 0 4px;color:white;font-size:22px;font-weight:900;">💬 Nouveau retour client</h1>
      <p style="margin:0;color:rgba(255,255,255,0.9);font-size:14px;">${commerce.nom}</p>
    </div>
    <div style="background:white;padding:28px 24px;border-radius:0 0 16px 16px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <p style="margin:0;font-size:15px;color:#0A0A0A;">Un client a laissé un retour sur ton commerce :</p>
      <div style="margin:16px 0;padding:16px;background:#FFF7ED;border-left:4px solid #FF6B00;border-radius:8px;">
        <p style="margin:0;font-size:22px;">${etoiles}</p>
        <p style="margin:6px 0 0;font-size:14px;font-weight:700;color:#FF6B00;">Note : ${note}/5</p>
        ${commentaireHtml}
      </div>
      <p style="margin:16px 0 0;font-size:12px;color:#9CA3AF;">Ce retour est privé — il ne sera pas publié publiquement.</p>
    </div>
  </div>
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
