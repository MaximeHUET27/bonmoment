import { createClient } from '@supabase/supabase-js'
import { verifierAnnulation } from '@/lib/emailLinks'

/**
 * Cible du lien "Je ne pourrai pas venir" dans les emails de confirmation
 * et de rappel. Pas de session requise (l'utilisateur clique depuis son
 * client mail) : le token HMAC signé par le serveur fait office d'autorisation.
 *
 * GET  = page de confirmation (les antivirus/scanners d'email visitent les
 *        liens automatiquement ; un GET ne doit jamais annuler tout seul)
 * POST = annulation réelle, via la fonction SQL annuler_bon() existante
 *        (même verrou FOR UPDATE, même restitution de stock que l'app).
 */

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

function page(titre, texte, bouton) {
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titre)} · BONMOMENT</title>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
     background:#F5F5F5;font-family:Montserrat,Arial,sans-serif;color:#3D3D3D;padding:24px}
.card{background:#fff;border-radius:16px;max-width:440px;width:100%;overflow:hidden;
      box-shadow:0 4px 24px rgba(0,0,0,.06)}
.head{background:#0A0A0A;padding:22px;text-align:center}
.logo{color:#FF6B00;font-weight:900;font-size:22px;letter-spacing:1px}
.tag{color:#fff;opacity:.75;font-size:12px;margin-top:4px}
.body{padding:32px 28px;text-align:center}
h1{font-size:22px;font-weight:900;color:#0A0A0A;margin:0 0 12px}
p{font-size:15px;line-height:1.6;margin:0 0 24px}
button{width:100%;border:0;border-radius:12px;background:#FF6B00;color:#fff;
       font-family:inherit;font-weight:700;font-size:16px;padding:17px;cursor:pointer}
a.back{display:inline-block;margin-top:18px;color:#9A9A9A;font-size:13px;text-decoration:underline}
</style></head><body>
<div class="card">
  <div class="head"><div class="logo">BONMOMENT</div><div class="tag">Soyez là au bon moment</div></div>
  <div class="body">
    <h1>${esc(titre)}</h1>
    <p>${texte}</p>
    ${bouton ? `<form method="POST" action="${esc(bouton.action)}"><button type="submit">${esc(bouton.label)}</button></form>` : ''}
    <a class="back" href="https://bonmoment.app">Retour sur BONMOMENT</a>
  </div>
</div></body></html>`
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
}

async function chargerReservation(id) {
  const { data } = await admin
    .from('reservations')
    .select('id, user_id, statut, offres:offre_id ( commerces:commerce_id ( nom ) )')
    .eq('id', id)
    .maybeSingle()
  return data
}

export async function GET(req) {
  const url = new URL(req.url)
  const id  = url.searchParams.get('r') || ''
  const t   = url.searchParams.get('t') || ''

  if (!verifierAnnulation(id, t)) {
    return page('Lien invalide', "Ce lien d'annulation n'est pas valide ou a expiré.")
  }

  const resa = await chargerReservation(id)
  if (!resa) return page('Bon introuvable', "Ce bon n'existe plus.")

  const commerce = esc(resa.offres?.commerces?.nom ?? 'le commerçant')

  if (resa.statut === 'annulee') {
    return page('Déjà annulé', `Ton bon chez <strong>${commerce}</strong> a déjà été libéré. Merci&nbsp;!`)
  }
  if (resa.statut !== 'reservee') {
    return page('Bon déjà utilisé', `Ce bon a déjà été validé chez <strong>${commerce}</strong>.`)
  }

  return page(
    'Tu ne pourras pas venir ?',
    `Ton bon chez <strong>${commerce}</strong> repartira aussitôt pour un autre habitant.`,
    { label: "Confirmer l'annulation", action: url.toString() },
  )
}

export async function POST(req) {
  const url = new URL(req.url)
  const id  = url.searchParams.get('r') || ''
  const t   = url.searchParams.get('t') || ''

  if (!verifierAnnulation(id, t)) {
    return page('Lien invalide', "Ce lien d'annulation n'est pas valide ou a expiré.")
  }

  const resa = await chargerReservation(id)
  if (!resa) return page('Bon introuvable', "Ce bon n'existe plus.")

  const commerce = esc(resa.offres?.commerces?.nom ?? 'le commerçant')

  const { data: res } = await admin.rpc('annuler_bon', {
    p_reservation_id: id,
    p_user_id:        resa.user_id,
  })
  const ok = Array.isArray(res) ? res[0]?.success === true : res?.success === true

  return ok
    ? page('C\'est annulé', `Merci de l'avoir dit. Le bon chez <strong>${commerce}</strong> est reparti pour quelqu'un d'autre.`)
    : page('Rien à annuler', "Ce bon n'était plus annulable.")
}
