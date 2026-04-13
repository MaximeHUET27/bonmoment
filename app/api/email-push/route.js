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
          htmlContent: `
<div style="font-family: Montserrat, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: #ffffff;">
  <div style="text-align: center; margin-bottom: 20px;">
    <span style="font-weight: 900; font-size: 24px; color: #FF6B00; letter-spacing: -0.5px;">BONMOMENT</span>
  </div>
  <p style="font-size: 16px; color: #0A0A0A; margin: 0 0 12px;">Salut ${prenom} ! 👋</p>
  <p style="font-size: 15px; color: #3D3D3D; margin: 0 0 16px;"><strong>${commerce_nom}</strong> vient de publier une offre à ${commerce_ville} :</p>
  <div style="background: #FFF0E0; border-radius: 12px; padding: 20px; margin: 0 0 20px; text-align: center;">
    <p style="font-size: 20px; font-weight: 800; color: #FF6B00; margin: 0 0 8px; line-height: 1.2;">${badge}</p>
    ${dateFin ? `<p style="font-size: 13px; color: #666; margin: 0;">Disponible jusqu'au ${dateFin}</p>` : ''}
  </div>
  <div style="text-align: center; margin: 0 0 28px;">
    <a href="https://bonmoment.app/ville/${villeSlug}" style="background: #FF6B00; color: #ffffff; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block;">Voir l'offre</a>
  </div>
  <hr style="border: none; border-top: 1px solid #eeeeee; margin: 0 0 20px;">
  <p style="font-size: 11px; color: #999999; text-align: center; margin: 0; line-height: 1.6;">
    Tu reçois cet email car tu suis <strong>${commerce_nom}</strong> ou la ville de <strong>${commerce_ville}</strong> sur BONMOMENT.<br>
    <a href="https://bonmoment.app/profil" style="color: #FF6B00;">Gérer mes notifications</a>
  </p>
</div>
          `.trim(),
        }),
      })
      sent++
    } catch (err) {
      console.error('[email-push] Erreur envoi à', dest.email, err.message)
    }
  }

  return Response.json({ sent, total: destinataires.length })
}
