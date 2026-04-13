import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BREVO_API_KEY = process.env.BREVO_API_KEY

/* ── Correspondance badge → heure de la route ── */
const BADGE_HEURES = {
  habitant:            21,
  bon_habitant:        20,
  habitant_exemplaire: 19,
}

function buildEmailHtml(offres, villesAbonnees) {
  const offresHtml = offres.map(o => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #F0F0F0;">
        <p style="margin:0;font-size:14px;font-weight:700;color:#0A0A0A;">${o.commerces?.nom || '—'}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#FF6B00;font-weight:600;">${o.titre}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#9CA3AF;">
          📍 ${o.commerces?.ville || ''}
          ${o.date_debut ? ` · Dès ${new Date(o.date_debut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}
        </p>
      </td>
    </tr>
  `).join('')

  const villesLabel = villesAbonnees.join(', ')

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:#FF6B00;border-radius:16px 16px 0 0;padding:24px;text-align:center;">
      <p style="margin:0;color:white;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">BONMOMENT</p>
      <h1 style="margin:8px 0 0;color:white;font-size:22px;font-weight:900;line-height:1.2;">
        🔥 Bons plans de demain
      </h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">À ${villesLabel}</p>
    </div>

    <!-- Corps -->
    <div style="background:white;padding:24px;border-radius:0 0 16px 16px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      ${offres.length > 0 ? `
        <p style="margin:0 0 16px;font-size:14px;color:#3D3D3D;">
          Voici les offres disponibles demain dans tes villes. Reserve vite, les bons s'envolent !
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${offresHtml}
        </table>
      ` : `
        <p style="text-align:center;color:#9CA3AF;font-size:14px;padding:24px 0;">
          Tes commerçants préparent des surprises... Reviens demain !
        </p>
      `}

      <!-- CTA -->
      <div style="text-align:center;margin-top:24px;">
        <a
          href="https://bonmoment.app"
          style="display:inline-block;background:#FF6B00;color:white;font-weight:700;font-size:14px;padding:14px 28px;border-radius:12px;text-decoration:none;"
        >
          Voir toutes les offres →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px 0 0;color:#9CA3AF;font-size:11px;">
      <p style="margin:0;">Tu reçois cet email car tu es abonné à des villes sur BONMOMENT.</p>
      <p style="margin:6px 0 0;">
        <a href="https://bonmoment.app/profil" style="color:#FF6B00;text-decoration:none;">
          Gérer mes préférences
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
  /* Vérification du secret cron Vercel */
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 })
  }

  /* Déterminer l'heure actuelle pour filtrer par badge (gère UTC+1 hiver / UTC+2 été) */
  const now    = new Date()
  const heureFR = parseInt(
    new Intl.DateTimeFormat('fr-FR', { hour: 'numeric', hour12: false, timeZone: 'Europe/Paris' }).format(now),
    10,
  )
  const badgeCible = Object.entries(BADGE_HEURES).find(([, h]) => h === heureFR)?.[0]

  if (!badgeCible) {
    return Response.json({ message: `Aucun envoi prévu à ${heureFR}h` })
  }

  /* Demain 00h00 → 23h59 */
  const demain     = new Date()
  demain.setDate(demain.getDate() + 1)
  const debutDemain = new Date(demain.getFullYear(), demain.getMonth(), demain.getDate(), 0,  0,  0)
  const finDemain   = new Date(demain.getFullYear(), demain.getMonth(), demain.getDate(), 23, 59, 59)

  /* Récupérer les users concernés */
  const { data: users } = await supabase
    .from('users')
    .select('id, email, nom, villes_abonnees, commerces_abonnes, badge_niveau')
    .eq('notifications_email', true)
    .eq('badge_niveau', badgeCible)

  if (!users?.length) {
    return Response.json({ message: 'Aucun utilisateur à notifier', badge: badgeCible })
  }

  let envoyes = 0
  let erreurs  = 0

  for (const u of users) {
    if (!u.email) continue

    const villesAbonnees  = u.villes_abonnees  || []
    const commercesAbonnes = u.commerces_abonnes || []

    /* Offres dans ses villes abonnées */
    let offres = []

    if (villesAbonnees.length > 0) {
      const { data: offresVilles } = await supabase
        .from('offres')
        .select('id, titre, date_debut, type_remise, valeur, commerces(nom, ville)')
        .eq('statut', 'active')
        .gte('date_debut', debutDemain.toISOString())
        .lte('date_debut', finDemain.toISOString())
        .in('commerces.ville', villesAbonnees)

      offres = [...offres, ...(offresVilles || [])]
    }

    /* Offres des commerces favoris (peu importe la ville) */
    if (commercesAbonnes.length > 0) {
      const { data: offresFavoris } = await supabase
        .from('offres')
        .select('id, titre, date_debut, type_remise, valeur, commerces(nom, ville)')
        .eq('statut', 'active')
        .gte('date_debut', debutDemain.toISOString())
        .lte('date_debut', finDemain.toISOString())
        .in('commerce_id', commercesAbonnes)

      // Déduplique par id
      const ids = new Set(offres.map(o => o.id))
      for (const o of offresFavoris || []) {
        if (!ids.has(o.id)) {
          offres.push(o)
          ids.add(o.id)
        }
      }
    }

    const prenom   = u.nom?.split(' ')[0] || 'toi'
    const villesStr = villesAbonnees.length ? villesAbonnees.join(', ') : 'ta ville'
    const sujet    = `🔥 ${offres.length} bon${offres.length > 1 ? 's' : ''} plan${offres.length > 1 ? 's' : ''} de demain à ${villesStr}, ${prenom} !`
    const html     = buildEmailHtml(offres, villesAbonnees.length ? villesAbonnees : ['ta ville'])

    const ok = await envoyerEmail(u.email, sujet, html)
    if (ok) envoyes++
    else    erreurs++
  }

  return Response.json({
    badge:   badgeCible,
    heure:   `${heureFR}h`,
    envoyes,
    erreurs,
    total:   users.length,
  })
}
