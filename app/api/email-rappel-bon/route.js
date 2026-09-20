import { createClient } from '@supabase/supabase-js'
import { BREVO_SENDER, BREVO_REPLY_TO } from '@/lib/brevo/sender'
import { signerAnnulation } from '@/lib/emailLinks'

/**
 * Appelée toutes les 10-15 min par un job pg_cron côté Supabase (pas un cron
 * Vercel : le plan Hobby du projet ne permet qu'une exécution par jour).
 * Postgres ne sert que de réveil — tout l'envoi (template, Brevo) reste ici,
 * au même pattern que /api/email-push et /api/email-quotidien.
 */

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SITE       = process.env.NEXT_PUBLIC_SITE_URL || 'https://bonmoment.app'
const FENETRE_MS = 2 * 60 * 60 * 1000

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

<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Ton bon chez ${commerce} expire à ${heureFin} — dernière ligne droite !</div>

<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#F5F5F5" style="background:#F5F5F5;padding:20px 0;">
<tr><td align="center" style="padding:20px 16px;">

<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

  <tr><td style="background:#FF6B00;padding:28px 24px;text-align:center;">
    <span style="font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;color:#FFFFFF;letter-spacing:2px;">BONMOMENT</span>
    <div style="font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;color:rgba(255,255,255,0.92);margin-top:8px;">⏰ Ton bon expire bientôt</div>
  </td></tr>

  <tr><td style="padding:32px 28px 8px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;color:#3D3D3D;line-height:1.7;text-align:center;">
    <p style="margin:0 0 4px;">Salut ${prenom} ! 👋</p>
    <p style="margin:0 0 24px;font-size:15px;">Ton bon chez <strong>${commerce}</strong> expire à <strong>${heureFin}</strong>.</p>

    <div style="background:#FFF8F0;border-left:4px solid #FF6B00;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:18px;font-weight:800;color:#FF6B00;">${badge} — ${offreTitre}</p>
      <img src="${qrImgUrl}" alt="QR code du bon" width="200" height="200" style="display:block;margin:0 auto 16px;border-radius:8px;" />
      <p style="margin:0;font-family:'Courier New',monospace;font-size:28px;letter-spacing:2px;color:#0A0A0A;">${code}</p>
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
    <a href="mailto:contact@bonmoment.app" style="color:#999999;text-decoration:none;">contact@bonmoment.app</a><br><br>
    <a href="${SITE}/profil" style="color:#999999;text-decoration:underline;font-size:11px;">Gérer mes notifications</a>
  </td></tr>

</table>
</td></tr>
</table>

</body>
</html>`
}

export async function GET(req) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.SUPABASE_CRON_SECRET}`) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const now = Date.now()

  const { data: candidats, error } = await admin
    .from('reservations')
    .select(`
      id, code_validation, qr_code_data,
      users:user_id ( email, nom, notifications_email ),
      offres:offre_id ( titre, type_remise, valeur, date_fin, commerces:commerce_id ( nom ) )
    `)
    .eq('statut', 'reservee')
    .is('rappel_envoye_at', null)

  if (error) {
    console.error('[email-rappel-bon]', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }

  let envoyes = 0, ignores = 0

  for (const r of candidats || []) {
    const offre    = r.offres
    const commerce = offre?.commerces
    const u        = r.users
    if (!offre?.date_fin || !commerce || !u?.email) continue

    const finMs = new Date(offre.date_fin).getTime()

    /* Trop tôt : pas encore dans la fenêtre H-2, on retentera au prochain passage */
    if (finMs - now > FENETRE_MS) continue

    /* Fenêtre passée (offre déjà expirée) ou utilisateur qui refuse les emails
       → on marque quand même pour ne plus jamais réexaminer cette réservation */
    const doitEnvoyer = finMs > now && u.notifications_email !== false

    if (doitEnvoyer) {
      const qrData     = r.qr_code_data || `${SITE}/bon/${r.id}`
      const qrImgUrl   = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(qrData)}`
      const bonUrl     = `${SITE}/bon/${r.id}`
      const annulerUrl = `${SITE}/api/annuler-bon-email?r=${r.id}&t=${signerAnnulation(r.id)}`
      const prenom     = (u.nom || '').split(' ')[0] || 'Habitant'

      const html = buildHtml({
        prenom,
        commerce:   commerce.nom,
        badge:      labelRemise(offre.type_remise, offre.valeur),
        offreTitre: offre.titre,
        heureFin:   heureFr(offre.date_fin),
        code:       formatCode(r.code_validation),
        qrImgUrl, bonUrl, annulerUrl,
      })

      try {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method:  'POST',
          headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender:      BREVO_SENDER,
            to:          [{ email: u.email, name: prenom }],
            replyTo:     BREVO_REPLY_TO,
            subject:     `⏰ Ton bon chez ${commerce.nom} expire à ${heureFr(offre.date_fin)} !`,
            htmlContent: html,
          }),
        })
        if (!res.ok) throw new Error(`Brevo ${res.status}`)
        envoyes++
      } catch (err) {
        console.error('[email-rappel-bon] envoi', r.id, err.message)
        continue // on retentera au prochain passage, sans marquer rappel_envoye_at
      }
    } else {
      ignores++
    }

    await admin
      .from('reservations')
      .update({ rappel_envoye_at: new Date().toISOString() })
      .eq('id', r.id)
  }

  return Response.json({ examinees: candidats?.length ?? 0, envoyes, ignores })
}
