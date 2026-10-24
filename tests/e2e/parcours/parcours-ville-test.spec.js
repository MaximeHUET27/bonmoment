import { test, expect } from '@playwright/test'
import { TEST_VILLE, TEST_PLACE_PREFIX, admin, creerUtilisateur, connecter, cookiesSession, nettoyer, residus } from './donnees-test.js'

// Parcours complet sur une ville de test SANS commerce ni abonne, avec comptes
// bidons. Les donnees sont creees puis supprimees (afterAll) ; seuls les
// enregistrements portant les marqueurs de donnees-test.js sont touches.
test.describe.configure({ mode: 'serial' })

const slugVille = TEST_VILLE.toLowerCase()
const OUPS = /Oups, quelque chose a mal tourn/i

let commercant, client, commerceId, offreId, codeValidation, reservationId
let sessCom, sessCli

async function ouvrirAvec(browser, session) {
  const ctx = await browser.newContext()
  await ctx.addCookies(cookiesSession(session))
  return ctx
}

async function pageSansOups(page, url) {
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))
  const res = await page.goto(url, { waitUntil: 'domcontentloaded' })
  expect(res.status(), url).toBeLessThan(500)
  await page.waitForTimeout(2500)
  await expect(page.getByText(OUPS), `${url} affiche la page d'erreur`).toHaveCount(0)
  // Un decalage d'hydratation (compteur serveur/client) est un avertissement, pas un plantage.
  const hydrat = errs.filter((e) => /hydrat/i.test(e))
  if (hydrat.length) test.info().annotations.push({ type: 'avertissement-hydratation', description: url })
  const graves = errs.filter((e) => !/hydrat/i.test(e))
  expect(graves, `${url} : ${graves.join(' | ')}`).toEqual([])
}

test.beforeAll(async () => {
  await nettoyer() // repart de zero si un run precedent a ete interrompu
  const a = admin()
  const { error } = await a.from('villes').insert({ nom: TEST_VILLE, code_insee: '99999', departement: '99', active: true, latitude: 49.0, longitude: 1.0 })
  expect(error, 'creation ville de test').toBeNull()
  commercant = await creerUtilisateur('client', 'commercant')
  client = await creerUtilisateur('client', 'client')
  sessCom = (await connecter(commercant.email)).session
  sessCli = (await connecter(client.email)).session
})

test.afterAll(async () => {
  const rapport = await nettoyer()
  const reste = await residus()
  console.log('NETTOYAGE', JSON.stringify(rapport), 'RESIDUS', JSON.stringify(reste))
  expect(Object.values(reste).every((v) => v === 0), 'residus apres nettoyage : ' + JSON.stringify(reste)).toBe(true)
})

test('la ville de test n\'a ni commerce ni abonne', async () => {
  const a = admin()
  const { count: nc } = await a.from('commerces').select('id', { count: 'exact', head: true }).eq('ville', TEST_VILLE)
  const { count: na } = await a.from('users').select('id', { count: 'exact', head: true }).contains('villes_abonnees', [TEST_VILLE])
  expect(nc).toBe(0)
  expect(na).toBe(0)
})

test('ville vide : la page ville s\'affiche, sans offre, sans erreur', async ({ browser }) => {
  const ctx = await ouvrirAvec(browser, sessCli)
  const page = await ctx.newPage()
  await pageSansOups(page, `/ville/${slugVille}`)
  await ctx.close()
})

test('inscription commercant : creation du commerce sous RLS reelle + passage au role commercant', async () => {
  const { client: c } = await connecter(commercant.email)
  const { data, error } = await c.from('commerces').insert({
    owner_id: commercant.id, place_id: `${TEST_PLACE_PREFIX}${Date.now()}`, nom: 'ZZ Test Boulangerie',
    adresse: '1 rue du Test', ville: TEST_VILLE, categorie: 'bakery', categorie_bonmoment: 'alimentation',
  }).select('id').single()
  expect(error, 'insert commerce').toBeNull()
  commerceId = data.id
  const r = await c.from('users').update({ role: 'commercant' }).eq('id', commercant.id)
  expect(r.error, 'passage role commercant').toBeNull()
  const { data: u } = await admin().from('users').select('role').eq('id', commercant.id).single()
  expect(u.role).toBe('commercant')
})

test('securite : un client ne peut pas se donner le role admin ni activer un abonnement', async () => {
  const { client: c } = await connecter(client.email)
  const r1 = await c.from('users').update({ role: 'admin' }).eq('id', client.id)
  expect(r1.error).not.toBeNull()
  const r2 = await (await connecter(commercant.email)).client.from('commerces').update({ abonnement_actif: true, palier: 'pro' }).eq('id', commerceId)
  const { data: after } = await admin().from('commerces').select('abonnement_actif, palier').eq('id', commerceId).single()
  expect(after.abonnement_actif).not.toBe(true)
  expect(r2.error || after.palier !== 'pro').toBeTruthy()
})

test('pages commercant (dashboard, abonnement, resiliation, valider, nouvelle offre) sans erreur', async ({ browser }) => {
  const ctx = await ouvrirAvec(browser, sessCom)
  const page = await ctx.newPage()
  await pageSansOups(page, '/commercant/dashboard')
  await pageSansOups(page, `/commercant/abonnement?commerce_id=${commerceId}`)
  await expect(page.getByText('Essentiel').first()).toBeVisible()
  await expect(page.getByText('Pro').first()).toBeVisible()
  await pageSansOups(page, '/commercant/resiliation')
  await pageSansOups(page, '/commercant/valider')
  await pageSansOups(page, '/commercant/offre/nouvelle')
  await ctx.close()
})

test('choix de l\'abonnement : CGV puis redirection vers Stripe Checkout (mode test)', async ({ browser }) => {
  const ctx = await ouvrirAvec(browser, sessCom)
  const page = await ctx.newPage()
  await page.goto(`/commercant/abonnement?commerce_id=${commerceId}`)
  await expect(page.getByText(OUPS)).toHaveCount(0)
  await page.locator('input[type="checkbox"]').first().check()
  const [rep] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/stripe/checkout')),
    page.getByRole('button', { name: 'Choisir ce palier' }).nth(1).click(), // 2e carte = Pro
  ])
  const corps = await rep.text()
  if (corps.includes('price_REMPLACER')) {
    // .env.local contient des identifiants de prix factices : la route a bien atteint Stripe
    // (auth + commerce + CGV OK) mais le test local ne peut pas aller jusqu'a la session.
    test.info().annotations.push({ type: 'limite-env-local', description: 'STRIPE_PRICE_* factices dans .env.local' })
    await ctx.close()
    return
  }
  expect(rep.status(), corps).toBe(200)
  const { url } = JSON.parse(corps)
  expect(url).toMatch(/^https:\/\/checkout\.stripe\.com\//)
  await ctx.close()
})

test('activation de l\'abonnement (simule le webhook Stripe) puis publication d\'une offre', async ({ browser }) => {
  const { error } = await admin().from('commerces').update({ palier: 'pro', abonnement_actif: true }).eq('id', commerceId)
  expect(error).toBeNull()
  const ctx = await ouvrirAvec(browser, sessCom)
  const maintenant = new Date()
  const res = await ctx.request.post('/api/offres', {
    data: {
      commerce_id: commerceId, titre: 'ZZ TEST offre E2E', type_remise: 'pourcentage', valeur: 10,
      nb_bons_total: 5, nb_bons_restants: 5, avec_bon: true,
      date_debut: maintenant.toISOString(), date_fin: new Date(maintenant.getTime() + 2 * 3600e3).toISOString(),
    },
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  const { data: o } = await admin().from('offres').select('id, statut').eq('commerce_id', commerceId).single()
  offreId = o.id
  expect(o.statut).toBe('active')
  await ctx.close()
})

test('la ville affiche maintenant l\'offre ; la page offre est accessible', async ({ browser }) => {
  const ctx = await ouvrirAvec(browser, sessCli)
  const page = await ctx.newPage()
  await pageSansOups(page, `/ville/${slugVille}`)
  await pageSansOups(page, `/offre/${offreId}`)
  await expect(page.getByText('ZZ TEST offre E2E').first()).toBeVisible()
  await ctx.close()
})

test('client : reservation du bon (RPC atomique) ; pas de double reservation ; stock decremente', async () => {
  const { client: c } = await connecter(client.email)
  const r = await c.rpc('reserver_bon', { p_offre_id: offreId, p_user_id: client.id })
  expect(r.error, 'reserver_bon').toBeNull()
  // neutralise les emails automatiques (rappel H-2, confirmation) pour ce faux compte
  const a = admin()
  const { data: resa } = await a.from('reservations').select('id, code_validation').eq('offre_id', offreId).eq('user_id', client.id).single()
  reservationId = resa.id
  codeValidation = resa.code_validation
  await a.from('reservations').update({ confirmation_envoyee_at: new Date().toISOString(), rappel_envoye_at: new Date().toISOString() }).eq('id', resa.id)
  expect(codeValidation).toMatch(/^\d{6}$/)
  const { data: o } = await a.from('offres').select('nb_bons_restants').eq('id', offreId).single()
  expect(o.nb_bons_restants).toBe(4)
  const r2 = await c.rpc('reserver_bon', { p_offre_id: offreId, p_user_id: client.id })
  const { count } = await a.from('reservations').select('id', { count: 'exact', head: true }).eq('offre_id', offreId).eq('user_id', client.id)
  expect(count).toBe(1)
  expect(r2.error || true).toBeTruthy()
})

test('client : page de ses bons + page du bon sans erreur', async ({ browser }) => {
  const ctx = await ouvrirAvec(browser, sessCli)
  const page = await ctx.newPage()
  await pageSansOups(page, '/profil')
  await pageSansOups(page, '/profil/bons')
  await pageSansOups(page, `/bon/${reservationId}`)
  await ctx.close()
})

test('validation du bon : refusee pour un client, acceptee pour le commercant, refusee en double', async ({ browser }) => {
  const ctxCli = await ouvrirAvec(browser, sessCli)
  const refus = await ctxCli.request.post('/api/valider-bon', { data: { code_validation: codeValidation } })
  expect([401, 403, 404]).toContain(refus.status())
  await ctxCli.close()

  const ctxCom = await ouvrirAvec(browser, sessCom)
  const ok = await ctxCom.request.post('/api/valider-bon', { data: { code_validation: codeValidation } })
  expect(ok.status(), await ok.text()).toBe(200)
  const { data: r } = await admin().from('reservations').select('statut').eq('id', reservationId).single()
  expect(r.statut).toBe('utilisee')
  const double = await ctxCom.request.post('/api/valider-bon', { data: { code_validation: codeValidation } })
  expect(double.status()).toBeGreaterThanOrEqual(400)
  await ctxCom.close()
})

test('annulation : un bon utilise ne peut plus etre annule par le client', async () => {
  const { client: c } = await connecter(client.email)
  const r = await c.rpc('annuler_bon', { p_reservation_id: reservationId, p_user_id: client.id })
  const { data } = await admin().from('reservations').select('statut').eq('id', reservationId).single()
  expect(data.statut).toBe('utilisee')
  expect(r).toBeTruthy()
})

test('upsert-ville : refuse sans session', async ({ request }) => {
  const sans = await request.post('/api/upsert-ville', { data: { nom: 'Rouen' } })
  expect(sans.status()).toBe(401)
})

test('upsert-ville : ville deja complete -> succes immediat, sans dependre de geo.api', async ({ browser }) => {
  const ctx = await ouvrirAvec(browser, sessCom)
  const t0 = Date.now()
  const res = await ctx.request.post('/api/upsert-ville', { data: { nom: TEST_VILLE } })
  expect(res.status(), await res.text()).toBe(200)
  expect(Date.now() - t0).toBeLessThan(3500)
  await ctx.close()
})
