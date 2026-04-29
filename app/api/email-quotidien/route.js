import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BREVO_API_KEY = process.env.BREVO_API_KEY

/* Badge → heure Paris cible */
const BADGE_HEURES = {
  habitant:            21,
  bon_habitant:        20,
  habitant_exemplaire: 19,
}

/* ── Utilitaires ─────────────────────────────────────────────────────────── */

function toSlug(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function heureStr(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
  })
}

function prefixRemise(type, valeur) {
  if (type === 'pourcentage' && valeur) return `-${valeur}% `
  if (type === 'montant_fixe' && valeur) return `-${valeur}€ `
  return ''
}

/* ── Template HTML ───────────────────────────────────────────────────────── */

function buildEmailHtml(offres, villesAbonnees) {
  /* Tri par urgence : expire le plus tôt en premier */
  const offresTriees = [...offres].sort((a, b) => new Date(a.date_fin) - new Date(b.date_fin))
  const MAX          = 5
  const offresMontrees = offresTriees.slice(0, MAX)
  const reste          = offresTriees.length - MAX

  const villesLabel = villesAbonnees.length > 0 ? villesAbonnees.join(' & ') : null
  const headerTitre = villesLabel
    ? `Bons plans de demain à ${villesLabel}`
    : 'Tes bons plans de demain'
  const footerText = villesLabel
    ? `Tu reçois cet email car tu es abonné à ${villesLabel} sur BONMOMENT.`
    : 'Tu reçois cet email car tu suis des commerçants sur BONMOMENT.'
  const lienVille = villesAbonnees[0]
    ? `https://bonmoment.app/ville/${toSlug(villesAbonnees[0])}`
    : 'https://bonmoment.app'

  const offresHtml = offresMontrees.map(o => {
    const commerceNom = o.commerces?.nom || '—'
    const note        = o.commerces?.note_google
      ? `<span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6B7280;white-space:nowrap;">⭐ ${o.commerces.note_google}</span>`
      : ''
    const hDebut  = o.date_debut ? heureStr(o.date_debut) : null
    const hFin    = o.date_fin   ? heureStr(o.date_fin)   : null
    const horaire = hDebut && hFin
      ? `🕐 De ${hDebut} à ${hFin}`
      : hDebut ? `🕐 Dès ${hDebut}` : ''
    const bons = (o.nb_bons_restants != null && o.nb_bons_restants !== 9999)
      ? `🎟 ${o.nb_bons_restants} bon${o.nb_bons_restants > 1 ? 's' : ''} disponible${o.nb_bons_restants > 1 ? 's' : ''}`
      : ''
    const badge = prefixRemise(o.type_remise, o.valeur).trim()

    return `
<div style="background:#FFF8F0;border-left:4px solid #FF6B00;border-radius:8px;padding:16px;margin-bottom:12px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>
    <td style="vertical-align:top;">
      <span style="font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#0A0A0A;">${commerceNom}</span>
    </td>
    <td style="text-align:right;vertical-align:top;padding-left:8px;white-space:nowrap;">
      ${note}${badge ? `<span style="font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#FF6B00;margin-left:6px;">${badge}</span>` : ''}
    </td>
  </tr></table>
  <p style="margin:6px 0 4px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:14px;color:#3D3D3D;">${o.titre}</p>
  ${(horaire || bons) ? `<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#999999;">${horaire}${horaire && bons ? '&nbsp;&nbsp;·&nbsp;&nbsp;' : ''}${bons}</p>` : ''}
  <a href="https://bonmoment.app/offre/${o.id}"
     style="display:inline-block;background:#FF6B00;color:#FFFFFF;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;padding:10px 20px;border-radius:8px;text-decoration:none;box-shadow:0 2px 4px rgba(255,107,0,0.3);">
    Réserver mon bon →
  </a>
</div>`
  }).join('')

  const resteHtml = reste > 0 ? `
<p style="text-align:center;margin:4px 0 16px;">
  <a href="${lienVille}"
     style="color:#FF6B00;font-family:Montserrat,Arial,Helvetica,sans-serif;font-weight:700;font-size:13px;text-decoration:none;">
    + ${reste} autre${reste > 1 ? 's' : ''} bon${reste > 1 ? 's' : ''} plan${reste > 1 ? 's' : ''} →
  </a>
</p>` : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${headerTitre}</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F5F5F5;">

<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">🔥 ${headerTitre} — Réserve vite, les bons s'envolent !</div>

<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#F5F5F5" style="background:#F5F5F5;padding:20px 0;">
<tr><td align="center" style="padding:20px 16px;">

<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

  <tr><td style="background:#FF6B00;padding:28px 24px;text-align:center;">
    <span style="font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;color:#FFFFFF;letter-spacing:2px;">BONMOMENT</span>
    <div style="font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:rgba(255,255,255,0.92);margin-top:8px;">🔥 ${headerTitre}</div>
  </td></tr>

  <tr><td style="padding:32px 28px 8px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:15px;color:#3D3D3D;line-height:1.7;">
    <p style="margin:0 0 20px;">Réserve vite, les bons s'envolent ! 🏃</p>
    ${offresHtml}
    ${resteHtml}
  </td></tr>

  <tr><td style="padding:8px 28px 32px;text-align:center;">
    <a href="${lienVille}"
       style="display:inline-block;background:#FF6B00;color:#FFFFFF;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;box-shadow:0 2px 4px rgba(255,107,0,0.3);">
      Voir toutes les offres →
    </a>
  </td></tr>

  <tr><td style="padding:0 28px;">
    <div style="border-top:1px solid #F0F0F0;"></div>
  </td></tr>

  <tr><td style="padding:20px 28px;text-align:center;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:12px;color:#999999;line-height:1.6;">
    L'équipe BONMOMENT<br>
    <a href="mailto:bonmomentapp@gmail.com" style="color:#999999;text-decoration:none;">bonmomentapp@gmail.com</a><br><br>
    <span style="font-size:11px;">${footerText}</span><br><br>
    <a href="https://bonmoment.app/profil" style="color:#999999;text-decoration:underline;font-size:11px;">Gérer mes préférences</a>
    &nbsp;·&nbsp;
    <a href="https://bonmoment.app/profil" style="color:#999999;text-decoration:underline;font-size:11px;">Se désinscrire</a>
  </td></tr>

</table>
</td></tr>
</table>

</body>
</html>`
}

/* ── Envoi Brevo ─────────────────────────────────────────────────────────── */

async function envoyerEmail(destinataire, sujet, htmlContent) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY },
    body: JSON.stringify({
      sender:      { name: 'BONMOMENT', email: 'bonmomentapp@gmail.com' },
      to:          [{ email: destinataire }],
      subject:     sujet,
      htmlContent,
    }),
  })
  return res.ok
}

/* ── Handler cron ────────────────────────────────────────────────────────── */

export async function GET(request) {
  /* Auth cron Vercel */
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 })
  }

  /* Heure Paris → badge cible */
  const now     = new Date()
  const heureFR = parseInt(
    new Intl.DateTimeFormat('fr-FR', { hour: 'numeric', hour12: false, timeZone: 'Europe/Paris' }).format(now),
    10,
  )
  const badgeCible = Object.entries(BADGE_HEURES).find(([, h]) => h === heureFR)?.[0]
  if (!badgeCible) {
    return Response.json({ message: `Aucun envoi prévu à ${heureFR}h` })
  }

  /* Fenêtre temporelle : demain en heure Paris */
  const demain      = new Date()
  demain.setDate(demain.getDate() + 1)
  const debutDemain = new Date(demain.getFullYear(), demain.getMonth(), demain.getDate(), 0,  0,  0)
  const finDemain   = new Date(demain.getFullYear(), demain.getMonth(), demain.getDate(), 23, 59, 59)

  /* 1. Pré-charger TOUTES les offres actives demain (1 seule requête) */
  const { data: toutesOffres } = await supabase
    .from('offres')
    .select('id, titre, date_debut, date_fin, type_remise, valeur, nb_bons_restants, commerce_id, commerces(nom, ville, note_google)')
    .eq('statut', 'active')
    .gte('date_fin',   debutDemain.toISOString())
    .lte('date_debut', finDemain.toISOString())

  /* Index en mémoire : ville → offres[], commerce_id → offres[] */
  const parVille     = {}
  const parCommerce  = {}
  for (const o of toutesOffres || []) {
    const ville = o.commerces?.ville
    if (ville) {
      parVille[ville] = parVille[ville] || []
      parVille[ville].push(o)
    }
    parCommerce[o.commerce_id] = parCommerce[o.commerce_id] || []
    parCommerce[o.commerce_id].push(o)
  }

  /* 2. Utilisateurs à notifier pour ce badge */
  const { data: users } = await supabase
    .from('users')
    .select('id, email, nom, villes_abonnees, commerces_abonnes, badge_niveau')
    .eq('notifications_email', true)
    .eq('badge_niveau', badgeCible)

  if (!users?.length) {
    return Response.json({ message: 'Aucun utilisateur à notifier', badge: badgeCible })
  }

  let envoyes = 0, erreurs = 0, skips = 0

  for (const u of users) {
    if (!u.email) continue

    const villesAbonnees   = u.villes_abonnees   || []
    const commercesAbonnes = u.commerces_abonnes || []

    /* Condition 1 : skip si aucun abonnement (ville ou commerce) */
    if (villesAbonnees.length === 0 && commercesAbonnes.length === 0) {
      skips++
      continue
    }

    /* Filtrage en mémoire : union des offres pertinentes, sans doublon */
    const ids       = new Set()
    const offresUser = []

    for (const ville of villesAbonnees) {
      for (const o of parVille[ville] || []) {
        if (!ids.has(o.id)) { ids.add(o.id); offresUser.push(o) }
      }
    }
    for (const cId of commercesAbonnes) {
      for (const o of parCommerce[cId] || []) {
        if (!ids.has(o.id)) { ids.add(o.id); offresUser.push(o) }
      }
    }

    /* Condition 2 : skip si aucune offre pertinente demain */
    if (offresUser.length === 0) {
      skips++
      continue
    }

    /* Sujet personnalisé */
    const n      = offresUser.length
    const ville1 = villesAbonnees[0] || null
    const sujet  = ville1
      ? `🔥 ${n} bon${n > 1 ? 's' : ''} plan${n > 1 ? 's' : ''} demain à ${ville1} !`
      : `🔥 ${n} bon${n > 1 ? 's' : ''} plan${n > 1 ? 's' : ''} demain chez tes commerçants !`

    const html = buildEmailHtml(offresUser, villesAbonnees)

    const ok = await envoyerEmail(u.email, sujet, html)
    if (ok) envoyes++
    else    erreurs++
  }

  return Response.json({ badge: badgeCible, heure: `${heureFR}h`, envoyes, erreurs, skips, total: users.length })
}
