import { test, expect } from '@playwright/test'

/**
 * Tests E2E : fusion Remise + Anti-gaspi
 *
 * Ces tests vérifient l'affichage UI sans authentification ni BDD réelle.
 * Les vérifications BDD (type_remise en base) nécessitent un compte test
 * et sont marquées skip — à activer dans un environnement de staging.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

/* ── Helpers ────────────────────────────────────────────────────────────── */

async function goToVille(page, ville = 'annecy') {
  await page.goto(`${BASE_URL}/ville/${ville}`)
  await page.waitForLoadState('networkidle')
}

/* ── Filtres page ville ─────────────────────────────────────────────────── */

test.describe('Filtres page ville — Remise et Anti-gaspi', () => {
  test('filtre "Remise" présent dans la barre de filtres', async ({ page }) => {
    await goToVille(page)
    const btn = page.locator('button', { hasText: 'Remise' }).first()
    await expect(btn).toBeVisible()
  })

  test('filtre "Anti-gaspi" présent dans la barre de filtres', async ({ page }) => {
    await goToVille(page)
    const btn = page.locator('button', { hasText: 'Anti-gaspi' }).first()
    await expect(btn).toBeVisible()
  })

  test('clic sur filtre "Remise" → devient actif (fond orange)', async ({ page }) => {
    await goToVille(page)
    const btn = page.locator('button', { hasText: 'Remise' }).first()
    await btn.click()
    await expect(btn).toHaveClass(/bg-\[#FF6B00\]/)
  })

  test('clic sur filtre "Anti-gaspi" → devient actif', async ({ page }) => {
    await goToVille(page)
    const btn = page.locator('button', { hasText: 'Anti-gaspi' }).first()
    await btn.click()
    await expect(btn).toHaveClass(/bg-\[#FF6B00\]/)
  })

  test('filtres existants toujours présents (non-régression)', async ({ page }) => {
    await goToVille(page)
    await expect(page.locator('button', { hasText: 'Tous' }).first()).toBeVisible()
    await expect(page.locator('button', { hasText: 'Offert' }).first()).toBeVisible()
    await expect(page.locator('button', { hasText: 'Évènement' }).first()).toBeVisible()
    await expect(page.locator('button', { hasText: 'Concours' }).first()).toBeVisible()
    await expect(page.locator('button', { hasText: 'Fidélité' }).first()).toBeVisible()
  })
})

/* ── Formulaire commerçant (sans auth → redirect, test skip) ────────────── */

test.describe('Formulaire création offre — structure grille', () => {
  test.skip('nécessite authentification — exécuter manuellement sur staging', () => {})

  // Ces tests sont documentés pour exécution manuelle :
  // 1. Se connecter en tant que commerçant
  // 2. Aller sur /commercant/offre/nouvelle
  // 3. Vérifier que la grille a 6 boutons dans l'ordre :
  //    [Cadeau][Évènement][Concours][Remise][Anti-gaspi][Fidélité]
  // 4. Cliquer "Remise" → switch %/€ visible, bouton % actif par défaut
  // 5. Cliquer "€" dans le switch → label sufixe change en €
  // 6. Cliquer "Anti-gaspi" → pas de section valeur, récurrence pré-cochée
})

/* ── Badge Anti-gaspi côté habitant ─────────────────────────────────────── */

test.describe('Badge Anti-gaspi sur OffreCard', () => {
  test.skip('nécessite offre anti_gaspi en base — exécuter sur staging', () => {})

  // Pour activer : créer une offre anti_gaspi via API, puis vérifier le badge
  // const offreId = '...'
  // await page.goto(`${BASE_URL}/offre/${offreId}`)
  // await expect(page.locator('text=🥗 Anti-gaspi')).toBeVisible()
})
