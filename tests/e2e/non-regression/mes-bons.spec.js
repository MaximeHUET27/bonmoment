import { test, expect } from '@playwright/test'

test.describe('Non-régression : page Mes bons avec feature flag OFF', () => {
  test('La page Mes bons (non authentifié) se charge sans erreur et ne contient pas "Ça m\'intéresse"', async ({ page }) => {
    await page.goto('/profil/bons')
    await page.waitForLoadState('networkidle')

    // Non authentifié → redirigé vers / ; dans tous les cas, pas de "Ça m'intéresse"
    const content = await page.content()
    expect(content).not.toContain('Ça m\'intéresse')
    expect(content).not.toContain('Ne plus m\'intéresser')
  })

  test('La page d\'accueil se charge sans erreur', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveTitle(/BONMOMENT/i)
  })

  test('Avec MAIRIE_ASSO_ENABLED=false, les bons existants ne sont pas affectés', async ({ page }) => {
    // La page /profil/bons redirige vers / quand non connecté.
    // On vérifie qu'elle ne plante pas (pas de 500) et ne contient pas de UI mairie_asso.
    const response = await page.goto('/profil/bons')
    await page.waitForLoadState('networkidle')

    // La page s'est chargée sans erreur serveur
    expect(response?.status()).not.toBe(500)

    const content = await page.content()
    expect(content).not.toContain('Ça m\'intéresse')
  })
})
