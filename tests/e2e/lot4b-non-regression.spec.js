import { test, expect } from '@playwright/test'

// Tests de non-régression UI Lot 4B
// Vérifient que les composants Lot 4B sont absents quand le flag est OFF

test.describe('Lot 4B — flag OFF : pages légales inchangées', () => {
  test('la page CGV ne contient pas "Mairie / Association" avec flag OFF', async ({ page }) => {
    await page.goto('/cgv')
    const section = page.locator('text=Cas particulier des comptes Mairie / Association')
    await expect(section).toHaveCount(0)
  })

  test('la page Confidentialité ne contient pas "5.3" avec flag OFF', async ({ page }) => {
    await page.goto('/confidentialite')
    const section = page.locator('text=5.3 Partage de données entre comptes Mairie')
    await expect(section).toHaveCount(0)
  })

  test('la page Registre CNIL ne contient plus "Obligations à remplir"', async ({ page }) => {
    await page.goto('/registre-cnil')
    const section = page.locator('text=Obligations à remplir avant le lancement')
    await expect(section).toHaveCount(0)
  })
})

test.describe('Lot 4B — flag OFF : FAQ et chatbot inchangés', () => {
  test('la page FAQ ne contient pas "Associations et mairies" avec flag OFF', async ({ page }) => {
    await page.goto('/aide')
    const cat = page.locator('text=Associations et mairies')
    await expect(cat).toHaveCount(0)
  })
})

test.describe('Lot 4B — Registre CNIL : suppression définitive vérifiée', () => {
  test('la section Procédure en cas de violation est toujours présente', async ({ page }) => {
    await page.goto('/registre-cnil')
    const section = page.locator('text=Procédure en cas de violation')
    await expect(section).toHaveCount(1)
  })
})
