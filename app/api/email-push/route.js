import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const checkRate = rateLimit({ maxRequests: 10, windowMs: 60 * 1000 })

export async function POST(req) {
  const limited = checkRate(req)
  if (limited) return limited

  /* ── Sécurité ── */
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const {
    commerce_id,
    commerce_nom,
    commerce_ville,
    offre_id,
    offre_titre,
    offre_type,
    offre_valeur,
    offre_date_fin,
  } = await req.json()

  if (!commerce_id || !commerce_nom || !commerce_ville || !offre_id) {
    return Response.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  /* ── Récupérer les destinataires ── */
  const [{ data: abonnesCommerce }, { data: abonnesVille }] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('id, email, nom')
      .contains('commerces_abonnes', [commerce_id])
      .eq('notifications_email_push', true),
    supabaseAdmin
      .from('users')
      .select('id, email, nom')
      .contains('villes_abonnees', [commerce_ville])
      .eq('notifications_email_push', true),
  ])

  /* ── Dédupliquer par email ── */
  const allDestinataires = [...(abonnesCommerce || []), ...(abonnesVille || [])]
  const seen = new Set()
  const destinataires = allDestinataires.filter(u => {
    if (!u.email || seen.has(u.email)) return false
    seen.add(u.email)
    return true
  })

  if (destinataires.length === 0) {
    return Response.json({ sent: 0, message: 'Aucun destinataire' })
  }

  /* ── Badge de l'offre ── */
  let badge = offre_titre || ''
  if (offre_type === 'pourcentage')                                          badge = `-${offre_valeur}% — ${offre_titre}`
  else if (offre_type === 'montant_fixe' || offre_type === 'montant')        badge = `-${offre_valeur}€ — ${offre_titre}`
  else if (offre_type === 'cadeau' || offre_type === 'produit_offert' || offre_type === 'service_offert') badge = `🎁 ${offre_titre}`
  else if (offre_type === 'concours')                                        badge = `🎰 ${offre_titre}`
  else if (offre_type === 'fidelite')                                        badge = `⭐ ${offre_titre}`
  else if (offre_type === 'atelier')                                         badge = `🎉 ${offre_titre}`

  /* ── Date de fin formatée ── */
  let dateFin = ''
  try {
    dateFin = new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
      timeZone: 'Europe/Paris',
    }).format(new Date(offre_date_fin))
  } catch {
    dateFin = offre_date_fin || ''
  }

  /* ── Slug ville ── */
  const villeSlug = commerce_ville
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  /* ── Envoi via Brevo ── */
  let sent = 0
  for (const dest of destinataires) {
    try {
      const prenom = dest.nom?.split(' ')[0] || 'Habitant'

      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key':     process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender:      { name: 'BONMOMENT', email: 'bonmomentapp@gmail.com' },
          to:          [{ email: dest.email, name: prenom }],
          subject:     `🔥 ${commerce_nom} vient de publier une offre !`,
          htmlContent: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F5F5F5;">

<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">🔥 ${commerce_nom} vient de publier une nouvelle offre à ${commerce_ville} !</div>

<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#F5F5F5" style="background:#F5F5F5;padding:20px 0;">
<tr><td align="center" style="padding:20px 16px;">

<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

  <tr><td style="background:#FF6B00;padding:28px 24px;text-align:center;">
    <span style="font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;color:#FFFFFF;letter-spacing:2px;">BONMOMENT</span>
    <div style="font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;color:rgba(255,255,255,0.92);margin-top:8px;">🔥 Nouvelle offre à ${commerce_ville}</div>
  </td></tr>

  <tr><td style="padding:32px 28px 8px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;color:#3D3D3D;line-height:1.7;">
    <p style="margin:0 0 12px;">Salut ${prenom} ! 👋</p>
    <p style="margin:0 0 20px;font-size:15px;"><strong>${commerce_nom}</strong> vient de publier une offre à ${commerce_ville} :</p>

    <div style="background:#FFF8F0;border-left:4px solid #FF6B00;border-radius:8px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:20px;font-weight:800;color:#FF6B00;line-height:1.2;">${badge}</p>
      ${dateFin ? `<p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#999999;">Disponible jusqu'au ${dateFin}</p>` : ''}
    </div>
  </td></tr>

  <tr><td style="padding:0 28px 32px;text-align:center;">
    <a href="https://bonmoment.app/ville/${villeSlug}"
       style="display:inline-block;background:#FF6B00;color:#FFFFFF;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;box-shadow:0 2px 4px rgba(255,107,0,0.3);">
      Voir l'offre →
    </a>
  </td></tr>

  <tr><td style="padding:0 28px;">
    <div style="border-top:1px solid #F0F0F0;"></div>
  </td></tr>

  <tr><td style="padding:20px 28px;text-align:center;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:12px;color:#999999;line-height:1.6;">
    L'équipe BONMOMENT<br>
    <a href="mailto:bonmomentapp@gmail.com" style="color:#999999;text-decoration:none;">bonmomentapp@gmail.com</a><br><br>
    <span style="font-size:11px;">Tu reçois cet email car tu suis <strong>${commerce_nom}</strong> ou la ville de <strong>${commerce_ville}</strong> sur BONMOMENT.</span><br><br>
    <a href="https://bonmoment.app/profil" style="color:#999999;text-decoration:underline;font-size:11px;">Gérer mes notifications</a>
    &nbsp;·&nbsp;
    <a href="https://bonmoment.app/profil" style="color:#999999;text-decoration:underline;font-size:11px;">Se désinscrire</a>
  </td></tr>

</table>
</td></tr>
</table>

</body>
</html>`,
        }),
      })
      sent++
    } catch (err) {
      console.error('[email-push] Erreur envoi à', dest.email, err.message)
    }
  }

  return Response.json({ sent, total: destinataires.length })
}
