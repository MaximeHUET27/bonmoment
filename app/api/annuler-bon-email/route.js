/**
 * Route historique du lien "Je ne pourrai pas venir" — remplacée par la page
 * /annuler (mêmes composants que le reste du site). Des emails déjà envoyés
 * pointent encore vers cette URL : on garde ce GET minimal en redirection
 * pour ne pas casser ces liens. À retirer quelques mois après la bascule
 * (les rappels/confirmations n'émettent plus que des liens vers /annuler).
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://bonmoment.app'

export async function GET(req) {
  const url = new URL(req.url)
  const id  = url.searchParams.get('r') || ''
  const t   = url.searchParams.get('t') || ''

  return Response.redirect(`${SITE}/annuler?r=${encodeURIComponent(id)}&t=${encodeURIComponent(t)}`, 302)
}
