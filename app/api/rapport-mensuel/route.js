import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BREVO_API_KEY = process.env.BREVO_API_KEY
const APP_URL = 'https://bonmoment.app'
const JWT_SECRET = process.env.CRON_SECRET

const MOIS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const JOURS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

/* Calcul KPIs en mémoire pour un commerce donné, à partir de données pré-chargées */
function calculerKpisMemoire(offres, resMois, resAvant, resMoisAvant, avis, feedbacks, debut, fin) {
  const offreIds = new Set(offres.map(o => o.id))
  const offreMap = Object.fromEntries(offres.map(o => [o.id, o]))

  const offresPubliees = offres.filter(o => {
    const d = new Date(o.created_at)
    return d >= debut && d <= fin
  }).length

  if (offreIds.size === 0) {
    return {
      bonsReserves: 0, bonsUtilises: 0, tauxConversion: 0,
      nouveauxClients: 0, clientsRecurrents: 0, offresPubliees,
      meilleureOffre: null, jourLePlusActif: null, caEstime: 0,
      evolutionPct: null, avisGoogleClics: avis.length, nbFeedbacks: 0, noteMoyenne: null,
    }
  }

  const utilisees = resMois.filter(r => r.statut === 'utilisee')
  const bonsReserves   = resMois.length
  const bonsUtilises   = utilisees.length
  const tauxConversion = bonsReserves > 0 ? Math.round(bonsUtilises / bonsReserves * 100) : 0

  /* Nouveaux vs récurrents */
  const userIdsMois  = [...new Set(resMois.map(r => r.user_id))]
  const userIdsAvant = new Set(resAvant.map(r => r.user_id))
  const nouveauxClients   = userIdsMois.filter(id => !userIdsAvant.has(id)).length
  const clientsRecurrents = userIdsMois.filter(id =>  userIdsAvant.has(id)).length

  /* Meilleure offre */
  const countByOffre = {}
  for (const r of utilisees) countByOffre[r.offre_id] = (countByOffre[r.offre_id] || 0) + 1
  let meilleureOffre = null, maxCount = 0
  for (const [offreId, count] of Object.entries(countByOffre)) {
    if (count > maxCount) { maxCount = count; meilleureOffre = offreMap[offreId]?.titre || null }
  }

  /* Jour le plus actif */
  const countByJour = {}
  for (const r of utilisees) {
    if (!r.utilise_at) continue
    const jour = new Date(r.utilise_at).getDay()
    countByJour[jour] = (countByJour[jour] || 0) + 1
  }
  let jourLePlusActif = null, maxJour = 0
  for (const [jour, count] of Object.entries(countByJour)) {
    if (count > maxJour) { maxJour = count; jourLePlusActif = JOURS_FR[parseInt(jour)] }
  }

  /* CA estimé */
  let caEstime = 0
  for (const r of utilisees) { const o = offreMap[r.offre_id]; if (o?.valeur) caEstime += o.valeur }

  /* Évolution vs M-2 */
  const bonsUtilisesMoisAvant = resMoisAvant.length
  let evolutionPct = null
  if (bonsUtilisesMoisAvant > 0) {
    evolutionPct = Math.round((bonsUtilises - bonsUtilisesMoisAvant) / bonsUtilisesMoisAvant * 100)
  } else if (bonsUtilises > 0) {
    evolutionPct = 100
  }

  /* Feedbacks */
  const nbFeedbacks = feedbacks.length
  const noteMoyenne = nbFeedbacks > 0
    ? Math.round((feedbacks.reduce((s, f) => s + f.note, 0) / nbFeedbacks) * 10) / 10
    : null

  return {
    bonsReserves, bonsUtilises, tauxConversion,
    nouveauxClients, clientsRecurrents, offresPubliees,
    meilleureOffre, jourLePlusActif, caEstime, evolutionPct,
    avisGoogleClics: avis.length, nbFeedbacks, noteMoyenne,
  }
}

function buildEmailHtml({ commerce, kpis, moisLabel, anneeLabel, unsubscribeUrl }) {
  const {
    bonsReserves, bonsUtilises, tauxConversion,
    nouveauxClients, clientsRecurrents, offresPubliees,
    meilleureOffre, jourLePlusActif, caEstime, evolutionPct,
    avisGoogleClics, nbFeedbacks, noteMoyenne,
  } = kpis

  const aucuneReservation = bonsReserves === 0

  /* Message adapté */
  let messageHtml
  if (aucuneReservation) {
    messageHtml = `
      <div style="background:#FFF7ED;border-left:4px solid #FF6B00;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#3D3D3D;">
          💡 Tu n'as pas eu de réservation ce mois. Publie une offre pour attirer des habitants !
        </p>
      </div>`
  } else if (evolutionPct !== null && evolutionPct > 0) {
    messageHtml = `
      <div style="background:#F0FDF4;border-left:4px solid #22C55E;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#3D3D3D;">
          🎉 Super mois ! Tes bons utilisés ont progressé de <strong>+${evolutionPct}%</strong> par rapport au mois dernier. Continue sur cette lancée !
        </p>
      </div>`
  } else {
    messageHtml = `
      <div style="background:#FFF7ED;border-left:4px solid #FF6B00;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#3D3D3D;">
          💡 ${evolutionPct !== null ? `Tes bons utilisés ont baissé de ${Math.abs(evolutionPct)}% ce mois. ` : ''}Crée une nouvelle offre attractive pour relancer l'activité et fidéliser tes clients !
        </p>
      </div>`
  }

  /* Tableau KPIs */
  const lignes = [
    ['Bons réservés', bonsReserves],
    ['Bons utilisés', bonsUtilises],
    ['Taux de conversion', `${tauxConversion}%`],
    ['Nouveaux clients', nouveauxClients],
    ['Clients récurrents', clientsRecurrents],
    ['Offres publiées', offresPubliees],
    ['Meilleure offre', meilleureOffre || '—'],
    ['Jour le plus actif', jourLePlusActif || '—'],
    ['CA estimé', `${caEstime.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`],
    ['Évolution vs mois précédent', evolutionPct !== null ? `${evolutionPct > 0 ? '+' : ''}${evolutionPct}%` : '—'],
    ['⭐ Invitations avis Google cliquées', avisGoogleClics],
    ['💬 Retours clients reçus', nbFeedbacks > 0 && noteMoyenne !== null ? `${nbFeedbacks} (note moyenne : ${noteMoyenne}/5)` : nbFeedbacks],
  ]

  const lignesHtml = lignes.map(([label, valeur], i) => `
    <tr style="background:${i % 2 === 0 ? '#FAFAFA' : '#FFFFFF'};">
      <td style="padding:12px 16px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:14px;color:#3D3D3D;">${label}</td>
      <td style="padding:12px 16px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#0A0A0A;text-align:right;">${valeur}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Bilan BONMOMENT — ${moisLabel} ${anneeLabel}</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F5F5F5;">

<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">📊 Ton bilan BONMOMENT — ${moisLabel} ${anneeLabel} — ${commerce.nom}</div>

<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#F5F5F5" style="background:#F5F5F5;padding:20px 0;">
<tr><td align="center" style="padding:20px 16px;">

<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

  <tr><td style="background:#FF6B00;padding:28px 24px;text-align:center;">
    <span style="font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;color:#FFFFFF;letter-spacing:2px;">BONMOMENT</span>
    <div style="font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;color:rgba(255,255,255,0.92);margin-top:8px;">📊 Bilan ${moisLabel} ${anneeLabel} — ${commerce.nom}</div>
  </td></tr>

  <tr><td style="padding:32px 28px 8px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:15px;color:#3D3D3D;line-height:1.7;">

    <p style="margin:0 0 20px;">Voici le résumé de ton activité sur BONMOMENT pour le mois de <strong>${moisLabel} ${anneeLabel}</strong>.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #F0F0F0;margin-bottom:20px;">
      <thead>
        <tr style="background:#FF6B00;">
          <th style="padding:12px 16px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#FFFFFF;text-align:left;text-transform:uppercase;letter-spacing:1px;">Indicateur</th>
          <th style="padding:12px 16px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#FFFFFF;text-align:right;text-transform:uppercase;letter-spacing:1px;">Valeur</th>
        </tr>
      </thead>
      <tbody>
        ${lignesHtml}
      </tbody>
    </table>

    ${messageHtml}

  </td></tr>

  <tr><td style="padding:8px 28px 32px;text-align:center;">
    <a href="${APP_URL}/commercant/offre/nouvelle"
       style="display:inline-block;background:#FF6B00;color:#FFFFFF;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;box-shadow:0 2px 4px rgba(255,107,0,0.3);">
      Créer une nouvelle offre →
    </a>
  </td></tr>

  <tr><td style="padding:0 28px;">
    <div style="border-top:1px solid #F0F0F0;"></div>
  </td></tr>

  <tr><td style="padding:20px 28px;text-align:center;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:12px;color:#999999;line-height:1.6;">
    L'équipe BONMOMENT<br>
    <a href="mailto:bonmomentapp@gmail.com" style="color:#999999;text-decoration:none;">bonmomentapp@gmail.com</a><br><br>
    Tu reçois ce rapport car tu es commerçant sur BONMOMENT.<br><br>
    <a href="${unsubscribeUrl}" style="color:#999999;text-decoration:underline;font-size:11px;">Se désinscrire de ces rapports</a>
  </td></tr>

</table>
</td></tr>
</table>

</body>
</html>`
}

async function envoyerEmail(destinataire, sujet, htmlContent) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: 'BONMOMENT', email: 'bonmomentapp@gmail.com' },
      to: [{ email: destinataire }],
      subject: sujet,
      htmlContent,
    }),
  })
  return res.ok
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const testMode = searchParams.get('test') === 'true'
  const testCommerceId = searchParams.get('commerce_id')

  /* Période : mois précédent */
  const now = new Date()
  const debutMois = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const finMois   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
  /* M-2 pour l'évolution */
  const debutMoisAvant = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  const finMoisAvant   = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999)

  const moisLabel = MOIS_FR[debutMois.getMonth()]
  const anneeLabel = debutMois.getFullYear()

  /* Commerces éligibles */
  let query = supabase
    .from('commerces')
    .select('id, nom, owner_id')
    .eq('abonnement_actif', true)
    .eq('rapport_mensuel_actif', true)

  if (testMode && testCommerceId) {
    query = query.eq('id', testCommerceId)
  }

  const { data: commerces, error: errCommerces } = await query

  if (errCommerces) {
    console.error('rapport-mensuel: erreur récupération commerces', errCommerces)
    return Response.json({ error: errCommerces.message }, { status: 500 })
  }

  if (!commerces?.length) {
    return Response.json({ message: 'Aucun commerce éligible' })
  }

  const commerceIds = commerces.map(c => c.id)
  const ownerIds    = [...new Set(commerces.map(c => c.owner_id))]

  /* ── Batch 1 : owners ──────────────────────────────────────────────────── */
  const { data: owners } = await supabase
    .from('users')
    .select('id, email, nom')
    .in('id', ownerIds)
  const ownerMap = Object.fromEntries((owners || []).map(u => [u.id, u]))

  /* ── Batch 2 : toutes les offres des commerces éligibles ───────────────── */
  const { data: toutesOffres } = await supabase
    .from('offres')
    .select('id, titre, valeur, type_remise, created_at, commerce_id')
    .in('commerce_id', commerceIds)

  const offresByCommerce = {}
  for (const o of toutesOffres || []) {
    offresByCommerce[o.commerce_id] = offresByCommerce[o.commerce_id] || []
    offresByCommerce[o.commerce_id].push(o)
  }
  const tousOffreIds = (toutesOffres || []).map(o => o.id)

  /* ── Batchs 3-7 : réservations + avis + feedbacks ─────────────────────── */
  /* Évite les .in([]) vides qui échouent */
  const [resMoisData, resAvantData, resMoisAvantData, tousAvisData, tousFeedbacksData] =
    tousOffreIds.length > 0
      ? await Promise.all([
          supabase.from('reservations')
            .select('id, user_id, offre_id, statut, utilise_at, created_at')
            .in('offre_id', tousOffreIds)
            .gte('created_at', debutMois.toISOString())
            .lte('created_at', finMois.toISOString()),
          supabase.from('reservations')
            .select('user_id, offre_id')
            .in('offre_id', tousOffreIds)
            .lt('created_at', debutMois.toISOString()),
          supabase.from('reservations')
            .select('id, offre_id')
            .in('offre_id', tousOffreIds)
            .gte('created_at', debutMoisAvant.toISOString())
            .lte('created_at', finMoisAvant.toISOString())
            .eq('statut', 'utilisee'),
          supabase.from('avis_google_clics')
            .select('commerce_id')
            .in('commerce_id', commerceIds)
            .gte('created_at', debutMois.toISOString())
            .lte('created_at', finMois.toISOString()),
          supabase.from('feedbacks_commerce')
            .select('commerce_id, note')
            .in('commerce_id', commerceIds)
            .gte('created_at', debutMois.toISOString())
            .lte('created_at', finMois.toISOString()),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }]

  const resMois      = resMoisData.data      || []
  const resAvant     = resAvantData.data     || []
  const resMoisAvant = resMoisAvantData.data || []
  const tousAvis     = tousAvisData.data     || []
  const tousFeedbacks = tousFeedbacksData.data || []

  /* ── Envoi des emails ─────────────────────────────────────────────────── */
  let envoyes = 0
  let erreurs  = 0

  for (const commerce of commerces) {
    try {
      const owner = ownerMap[commerce.owner_id]
      if (!owner?.email) continue

      /* Filtrage en mémoire pour ce commerce */
      const offres          = offresByCommerce[commerce.id] || []
      const offreIds        = new Set(offres.map(o => o.id))
      const resMoisC        = resMois.filter(r => offreIds.has(r.offre_id))
      const resAvantC       = resAvant.filter(r => offreIds.has(r.offre_id))
      const resMoisAvantC   = resMoisAvant.filter(r => offreIds.has(r.offre_id))
      const avisC           = tousAvis.filter(a => a.commerce_id === commerce.id)
      const feedbacksC      = tousFeedbacks.filter(f => f.commerce_id === commerce.id)

      const kpis = calculerKpisMemoire(
        offres, resMoisC, resAvantC, resMoisAvantC, avisC, feedbacksC, debutMois, finMois,
      )

      const token = jwt.sign({ commerce_id: commerce.id }, JWT_SECRET, { expiresIn: '60d' })
      const unsubscribeUrl = `${APP_URL}/api/rapport-mensuel/unsubscribe?token=${token}`

      const html  = buildEmailHtml({ commerce, kpis, moisLabel, anneeLabel, unsubscribeUrl })
      const sujet = `📊 Ton bilan BONMOMENT — ${moisLabel} ${anneeLabel}`

      const ok = await envoyerEmail(owner.email, sujet, html)
      if (ok) envoyes++
      else {
        console.error(`rapport-mensuel: échec envoi pour commerce ${commerce.id}`)
        erreurs++
      }
    } catch (err) {
      console.error(`rapport-mensuel: erreur commerce ${commerce.id}`, err)
      erreurs++
    }
  }

  return Response.json({
    mois: `${moisLabel} ${anneeLabel}`,
    total: commerces.length,
    envoyes,
    erreurs,
  })
}
