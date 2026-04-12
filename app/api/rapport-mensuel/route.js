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

async function calculerKpis(commerceId, debut, fin, debutMoisAvant, finMoisAvant) {
  /* Toutes les offres du commerce */
  const { data: offres } = await supabase
    .from('offres')
    .select('id, titre, valeur, type_remise, created_at')
    .eq('commerce_id', commerceId)

  const offreIds = (offres || []).map(o => o.id)
  const offreMap = Object.fromEntries((offres || []).map(o => [o.id, o]))

  /* Offres publiées ce mois */
  const offresPubliees = (offres || []).filter(o => {
    const d = new Date(o.created_at)
    return d >= debut && d <= fin
  }).length

  if (offreIds.length === 0) {
    return {
      bonsReserves: 0,
      bonsUtilises: 0,
      tauxConversion: 0,
      nouveauxClients: 0,
      clientsRecurrents: 0,
      offresPubliees,
      meilleureOffre: null,
      jourLePlusActif: null,
      caEstime: 0,
      evolutionPct: null,
    }
  }

  /* Réservations du mois précédent */
  const { data: reservationsMois } = await supabase
    .from('reservations')
    .select('id, user_id, offre_id, statut, utilise_at, created_at')
    .in('offre_id', offreIds)
    .gte('created_at', debut.toISOString())
    .lte('created_at', fin.toISOString())

  const reservations = reservationsMois || []
  const utilisees = reservations.filter(r => r.statut === 'utilisee')

  const bonsReserves = reservations.length
  const bonsUtilises = utilisees.length
  const tauxConversion = bonsReserves > 0 ? Math.round(bonsUtilises / bonsReserves * 100) : 0

  /* Nouveaux vs récurrents */
  const userIdsMois = [...new Set(reservations.map(r => r.user_id))]
  let nouveauxClients = 0
  let clientsRecurrents = 0

  if (userIdsMois.length > 0) {
    const { data: avant } = await supabase
      .from('reservations')
      .select('user_id')
      .in('offre_id', offreIds)
      .lt('created_at', debut.toISOString())
      .in('user_id', userIdsMois)

    const userIdsAvant = new Set((avant || []).map(r => r.user_id))
    nouveauxClients = userIdsMois.filter(id => !userIdsAvant.has(id)).length
    clientsRecurrents = userIdsMois.filter(id => userIdsAvant.has(id)).length
  }

  /* Meilleure offre */
  const countByOffre = {}
  for (const r of utilisees) {
    countByOffre[r.offre_id] = (countByOffre[r.offre_id] || 0) + 1
  }
  let meilleureOffre = null
  let maxCount = 0
  for (const [offreId, count] of Object.entries(countByOffre)) {
    if (count > maxCount) {
      maxCount = count
      meilleureOffre = offreMap[offreId]?.titre || null
    }
  }

  /* Jour le plus actif */
  const countByJour = {}
  for (const r of utilisees) {
    if (!r.utilise_at) continue
    const jour = new Date(r.utilise_at).getDay()
    countByJour[jour] = (countByJour[jour] || 0) + 1
  }
  let jourLePlusActif = null
  let maxJour = 0
  for (const [jour, count] of Object.entries(countByJour)) {
    if (count > maxJour) {
      maxJour = count
      jourLePlusActif = JOURS_FR[parseInt(jour)]
    }
  }

  /* CA estimé */
  let caEstime = 0
  for (const r of utilisees) {
    const offre = offreMap[r.offre_id]
    if (offre?.valeur) caEstime += offre.valeur
  }

  /* Évolution vs M-2 */
  const { data: reservationsMoisAvant } = await supabase
    .from('reservations')
    .select('id')
    .in('offre_id', offreIds)
    .gte('created_at', debutMoisAvant.toISOString())
    .lte('created_at', finMoisAvant.toISOString())
    .eq('statut', 'utilisee')

  const bonsUtilisesMoisAvant = (reservationsMoisAvant || []).length
  let evolutionPct = null
  if (bonsUtilisesMoisAvant > 0) {
    evolutionPct = Math.round((bonsUtilises - bonsUtilisesMoisAvant) / bonsUtilisesMoisAvant * 100)
  } else if (bonsUtilises > 0) {
    evolutionPct = 100
  }

  /* Avis Google cliqués ce mois */
  const { count: avisGoogleClics } = await supabase
    .from('avis_google_clics')
    .select('id', { count: 'exact', head: true })
    .eq('commerce_id', commerceId)
    .gte('created_at', debut.toISOString())
    .lte('created_at', fin.toISOString())

  /* Feedbacks privés reçus ce mois */
  const { data: feedbacksMois } = await supabase
    .from('feedbacks_commerce')
    .select('note')
    .eq('commerce_id', commerceId)
    .gte('created_at', debut.toISOString())
    .lte('created_at', fin.toISOString())

  const nbFeedbacks = (feedbacksMois || []).length
  const noteMoyenne = nbFeedbacks > 0
    ? Math.round((feedbacksMois.reduce((s, f) => s + f.note, 0) / nbFeedbacks) * 10) / 10
    : null

  return {
    bonsReserves,
    bonsUtilises,
    tauxConversion,
    nouveauxClients,
    clientsRecurrents,
    offresPubliees,
    meilleureOffre,
    jourLePlusActif,
    caEstime,
    evolutionPct,
    avisGoogleClics: avisGoogleClics ?? 0,
    nbFeedbacks,
    noteMoyenne,
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
    <tr style="background:${i % 2 === 0 ? '#FAFAFA' : 'white'};">
      <td style="padding:12px 16px;font-size:13px;color:#6B7280;border-bottom:1px solid #F0F0F0;">${label}</td>
      <td style="padding:12px 16px;font-size:14px;font-weight:700;color:#0A0A0A;text-align:right;border-bottom:1px solid #F0F0F0;">${valeur}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Bilan BONMOMENT — ${moisLabel} ${anneeLabel}</title>
</head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:'Montserrat',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:#FF6B00;border-radius:16px 16px 0 0;padding:32px 24px;text-align:center;">
      <p style="margin:0;color:white;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">BONMOMENT</p>
      <h1 style="margin:12px 0 4px;color:white;font-size:26px;font-weight:900;line-height:1.2;">
        📊 Ton bilan mensuel
      </h1>
      <p style="margin:0;color:rgba(255,255,255,0.9);font-size:16px;font-weight:600;">
        ${moisLabel} ${anneeLabel} — ${commerce.nom}
      </p>
    </div>

    <!-- Corps -->
    <div style="background:white;padding:28px 24px;border-radius:0 0 16px 16px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

      <p style="margin:0 0 20px;font-size:14px;color:#3D3D3D;line-height:1.6;">
        Voici le résumé de ton activité sur BONMOMENT pour le mois de <strong>${moisLabel} ${anneeLabel}</strong>.
      </p>

      <!-- Tableau KPIs -->
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:12px;overflow:hidden;border:1px solid #F0F0F0;">
        <thead>
          <tr style="background:#FF6B00;">
            <th style="padding:12px 16px;font-size:12px;font-weight:700;color:white;text-align:left;text-transform:uppercase;letter-spacing:1px;">Indicateur</th>
            <th style="padding:12px 16px;font-size:12px;font-weight:700;color:white;text-align:right;text-transform:uppercase;letter-spacing:1px;">Valeur</th>
          </tr>
        </thead>
        <tbody>
          ${lignesHtml}
        </tbody>
      </table>

      ${messageHtml}

      <!-- CTA -->
      <div style="text-align:center;margin-top:28px;">
        <a
          href="${APP_URL}/commercant/offre/nouvelle"
          style="display:inline-block;background:#FF6B00;color:white;font-family:'Montserrat',Arial,sans-serif;font-weight:700;font-size:15px;padding:16px 32px;border-radius:12px;text-decoration:none;"
        >
          Créer une nouvelle offre →
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px 0 0;color:#9CA3AF;font-size:11px;line-height:1.8;">
      <p style="margin:0;">Tu reçois ce rapport car tu es commerçant sur BONMOMENT.</p>
      <p style="margin:4px 0 0;">
        <a href="${unsubscribeUrl}" style="color:#9CA3AF;text-decoration:underline;">
          Se désinscrire de ces rapports
        </a>
      </p>
    </div>

  </div>
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

  let envoyes = 0
  let erreurs  = 0

  for (const commerce of commerces) {
    try {
      /* Email du propriétaire */
      const { data: owner } = await supabase
        .from('users')
        .select('email, nom')
        .eq('id', commerce.owner_id)
        .single()

      if (!owner?.email) continue

      /* KPIs */
      const kpis = await calculerKpis(
        commerce.id,
        debutMois,
        finMois,
        debutMoisAvant,
        finMoisAvant,
      )

      /* Token désinscription (valide 60 jours) */
      const token = jwt.sign({ commerce_id: commerce.id }, JWT_SECRET, { expiresIn: '60d' })
      const unsubscribeUrl = `${APP_URL}/api/rapport-mensuel/unsubscribe?token=${token}`

      const html = buildEmailHtml({ commerce, kpis, moisLabel, anneeLabel, unsubscribeUrl })
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
