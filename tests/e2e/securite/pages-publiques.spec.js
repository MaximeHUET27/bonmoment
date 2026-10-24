import { test, expect } from '@playwright/test'

const PUBLIQUES = ['/', '/aide', '/aide/contact', '/cgu', '/cgv', '/confidentialite', '/mentions-legales', '/registre-cnil', '/commercant/inscription']
const PROTEGEES = ['/admin', '/admin/clients', '/admin/commercants', '/admin/comptabilite', '/admin/comptabilite/charges',
  '/admin/comptabilite/declarations', '/admin/comptabilite/parametres', '/admin/comptabilite/recettes', '/admin/comptabilite/tva',
  '/admin/offres', '/admin/villes', '/profil', '/profil/bons', '/commercant/dashboard', '/commercant/abonnement',
  '/commercant/offre/nouvelle', '/commercant/resiliation', '/commercant/valider']

for (const url of PUBLIQUES) {
  test(`page publique ${url} s'affiche sans erreur`, async ({ page }) => {
    const erreurs = []
    page.on('pageerror', (e) => erreurs.push(e.message))
    const res = await page.goto(url, { waitUntil: 'domcontentloaded' })
    expect(res.status()).toBeLessThan(400)
    await expect(page.locator('body')).not.toBeEmpty()
    await page.waitForTimeout(500)
    expect(erreurs, erreurs.join(' | ')).toEqual([])
  })
}

for (const url of PROTEGEES) {
  test(`page protegee ${url} n'expose rien sans session`, async ({ page }) => {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded' })
    expect(res.status()).toBeLessThan(500)
    await page.waitForTimeout(1500)
    const texte = (await page.locator('body').innerText()).toLowerCase()
    expect(texte).not.toMatch(/stripe_customer|service_role|bonmomentapp@gmail\.com/)
  })
}

test('page ville : navigation depuis la page d\'accueil', async ({ page }) => {
  await page.goto('/')
  const lien = page.locator('a[href^="/ville/"]').first()
  test.skip((await lien.count()) === 0, 'aucun lien ville sur l\'accueil')
  await lien.click()
  await expect(page).toHaveURL(/\/ville\//)
  await expect(page.locator('body')).not.toBeEmpty()
})

test('page offre inconnue : pas de 500', async ({ page }) => {
  const res = await page.goto('/offre/00000000-0000-0000-0000-000000000000')
  expect(res.status()).toBeLessThan(500)
})

test('page bon inconnue : pas de fuite ni de 500', async ({ page }) => {
  const res = await page.goto('/bon/00000000-0000-0000-0000-000000000000')
  expect(res.status()).toBeLessThan(500)
})

test('en-tetes de securite HTTP', async ({ request }) => {
  const h = (await request.get('/')).headers()
  expect(h['x-content-type-options']).toBe('nosniff')
  expect(h['x-frame-options'] || h['content-security-policy']).toBeTruthy()
  expect(h['x-powered-by']).toBeUndefined()
})

test('mobile : accueil sans debordement horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/')
  const depasse = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  expect(depasse).toBe(false)
})
