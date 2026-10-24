import { test, expect } from '@playwright/test'

// Aucune session : chaque route protegee doit refuser AVANT de travailler.
// Les routes cron exigent Bearer CRON_SECRET (jamais fourni ici).
const UUID = '00000000-0000-0000-0000-000000000000'

const PROTEGEES = [
  ['POST', '/api/admin/activer-abonnement'], ['GET', '/api/admin/clients'], ['GET', `/api/admin/clients/${UUID}`],
  ['GET', '/api/admin/commercants'], ['GET', `/api/admin/commercants/${UUID}`], ['GET', '/api/admin/comptabilite/charges'],
  ['GET', '/api/admin/comptabilite/dashboard'], ['POST', '/api/admin/comptabilite/export'], ['GET', '/api/admin/comptabilite/parametres'],
  ['GET', '/api/admin/comptabilite/recettes'], ['POST', '/api/admin/comptabilite/recettes/sync'], ['GET', '/api/admin/comptabilite/tva'],
  ['GET', '/api/admin/dashboard'], ['POST', '/api/admin/email-gagnant'], ['GET', '/api/admin/offres'], ['GET', `/api/admin/offres/${UUID}`],
  ['GET', '/api/admin/stats'], ['GET', '/api/admin/villes'], ['POST', '/api/admin/villes'],
  ['POST', '/api/carte/update-coords'], ['PATCH', '/api/commercant/logo-affiche'], ['GET', '/api/commercant/offres-collectives'],
  ['GET', '/api/commerce/cagnotte'], ['POST', '/api/commerce/refresh-from-google'], ['POST', '/api/commerce/supprimer'],
  ['POST', '/api/compte/supprimer'], ['POST', '/api/avis-google'], ['POST', '/api/email-confirmation-bon'], ['POST', '/api/feedback-commerce'],
  ['POST', '/api/fidelite/activer-carte'], ['POST', '/api/fidelite/ajuster-tampons'], ['POST', '/api/fidelite/annuler-passage'],
  ['POST', '/api/fidelite/confirmer-recompense'], ['POST', '/api/fidelite/desactiver'], ['POST', '/api/fidelite/enregistrer-passage'],
  ['POST', '/api/fidelite/modifier-telephone'], ['POST', '/api/fidelite/programme'],
  ['GET', `/api/mairie-asso/commercants-invitables?asso_id=${UUID}`], ['PATCH', `/api/mairie-asso/invitations/${UUID}`],
  ['POST', '/api/mairie-asso/invitations'], ['POST', '/api/mairie-asso/logo'], ['DELETE', '/api/mairie-asso/logo'],
  ['GET', `/api/mairie-asso/stats-cumulees?asso_id=${UUID}`], ['GET', '/api/mes-bons'], ['GET', '/api/mes-participations'],
  ['GET', `/api/offres/${UUID}/participants`], ['POST', `/api/offres/${UUID}/participants`], ['POST', '/api/offres'],
  ['GET', '/api/parrainage/valider-code'], ['POST', '/api/push/notify-offre'], ['POST', '/api/push/notify-reservation'],
  ['POST', '/api/push/subscribe'], ['POST', '/api/stripe/checkout'], ['POST', '/api/stripe/resiliation'], ['GET', '/api/stripe/subscription-info'],
  ['POST', '/api/tirer-au-sort'], ['POST', '/api/upload-photo-commerce'], ['POST', '/api/upsert-ville'], ['POST', '/api/valider-bon'],
  ['GET', '/api/wallet/google'],
]

const CRON = [
  ['POST', '/api/email-push'], ['GET', '/api/email-quotidien'], ['GET', '/api/email-rappel-bon'], ['GET', '/api/expirer-offres'],
  ['GET', '/api/maj-commerces'], ['POST', '/api/push/send'], ['GET', '/api/rapport-mensuel'],
]

// Routes qui valident leurs parametres avant l'authentification : on fournit des
// parametres valides pour que ce soit bien l'auth qui refuse.
const CORPS = {
  '/api/commerce/refresh-from-google': { commerce_id: UUID },
  '/api/email-confirmation-bon': { reservation_id: UUID },
  '/api/upload-photo-commerce': { commerce_id: UUID, photo_url_google: 'https://lh3.googleusercontent.com/x' },
}
const QUERY = {
  '/api/parrainage/valider-code': '?code=ABCDEF&commerce_id=' + UUID,
  '/api/wallet/google': '?reservation_id=' + UUID,
}

for (const [method, base] of [...PROTEGEES, ...CRON]) {
  const url = base + (QUERY[base] || '')
  test(`${method} ${base.split('?')[0]} refuse sans session`, async ({ request }) => {
    const res = await request.fetch(url, { method, data: method === 'GET' ? undefined : (CORPS[base] || {}), maxRedirects: 0 })
    // wallet/google : 500 local si la config Google Wallet est absente (jamais un 2xx).
    const ok = base === '/api/wallet/google' ? [401, 403, 500] : [401, 403]
    expect(ok, `statut ${res.status()}`).toContain(res.status())
  })
}

test('cron : un faux Bearer est refuse', async ({ request }) => {
  for (const [method, url] of CRON) {
    const res = await request.fetch(url, { method, headers: { authorization: 'Bearer faux-secret' }, data: method === 'GET' ? undefined : {} })
    expect(res.status(), url).toBe(401)
  }
})

test('webhook Stripe : signature absente ou fausse refusee', async ({ request }) => {
  const sans = await request.post('/api/webhooks/stripe', { data: '{}' })
  expect(sans.status()).toBeGreaterThanOrEqual(400)
  expect(sans.status()).toBeLessThan(500)
  const fausse = await request.post('/api/webhooks/stripe', { data: '{"type":"checkout.session.completed"}', headers: { 'stripe-signature': 't=1,v1=deadbeef' } })
  expect(fausse.status()).toBeGreaterThanOrEqual(400)
  expect(fausse.status()).toBeLessThan(500)
})

test('set-session refuse des tokens invalides', async ({ request }) => {
  const res = await request.post('/api/auth/set-session', { data: { access_token: 'x', refresh_token: 'y' } })
  expect(res.status()).toBeGreaterThanOrEqual(400)
  expect(res.status()).toBeLessThan(500)
})

test('desinscription rapport : jeton absent ou falsifie refuse', async ({ request }) => {
  expect((await request.get('/api/rapport-mensuel/unsubscribe')).status()).toBe(400)
  expect((await request.get('/api/rapport-mensuel/unsubscribe?token=abc.def.ghi')).status()).toBe(400)
})

test('routes publiques : repondent sans erreur serveur', async ({ request }) => {
  expect((await request.get('/api/carte')).status()).toBeLessThan(500)
  expect((await request.get(`/api/bon-statut/${UUID}`)).status()).toBe(404)
  expect((await request.get('/api/microsoft-identity')).status()).toBe(200)
})

test('bon-statut : id invalide ne fuit aucun detail', async ({ request }) => {
  const res = await request.get('/api/bon-statut/not-a-uuid')
  expect(res.status()).toBeLessThan(500)
  expect(await res.text()).not.toMatch(/relation|syntax|postgres|stack/i)
})
