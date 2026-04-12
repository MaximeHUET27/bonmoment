import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const JWT_SECRET = process.env.CRON_SECRET

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return new Response(pageHtml('Lien invalide', 'Ce lien de désinscription est invalide.', false), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  let payload
  try {
    payload = jwt.verify(token, JWT_SECRET)
  } catch {
    return new Response(pageHtml('Lien expiré', 'Ce lien de désinscription a expiré ou est invalide.', false), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const { commerce_id } = payload

  const { error } = await supabase
    .from('commerces')
    .update({ rapport_mensuel_actif: false })
    .eq('id', commerce_id)

  if (error) {
    console.error('rapport-mensuel/unsubscribe: erreur mise à jour', error)
    return new Response(pageHtml('Erreur', 'Une erreur est survenue. Merci de réessayer.', false), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  return new Response(pageHtml('Désinscription confirmée', 'Tu ne recevras plus les rapports mensuels.', true), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function pageHtml(titre, message, succes) {
  const couleur = succes ? '#22C55E' : '#EF4444'
  const icone   = succes ? '✅' : '⚠️'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${titre} — BONMOMENT</title>
</head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:'Montserrat',Arial,sans-serif;">
  <div style="max-width:480px;margin:80px auto;padding:0 16px;text-align:center;">

    <div style="background:#FF6B00;border-radius:16px 16px 0 0;padding:24px;">
      <p style="margin:0;color:white;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">BONMOMENT</p>
    </div>

    <div style="background:white;border-radius:0 0 16px 16px;padding:40px 32px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="font-size:48px;margin-bottom:16px;">${icone}</div>
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:#0A0A0A;">${titre}</h1>
      <p style="margin:0 0 28px;font-size:15px;color:#6B7280;line-height:1.6;">${message}</p>
      <a
        href="https://bonmoment.app/commercant"
        style="display:inline-block;background:#FF6B00;color:white;font-weight:700;font-size:14px;padding:14px 28px;border-radius:12px;text-decoration:none;"
      >
        Retour au tableau de bord
      </a>
    </div>

  </div>
</body>
</html>`
}
