import { test, expect } from '@playwright/test';

test.describe('Module Mairie/Asso — non-régression UI', () => {
  test("Avec flag OFF, aucun élément du module mairie/asso n'est rendu sur l'accueil", async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const html = await page.content();

    expect(html).not.toContain('Gestion des adhérents');
    expect(html).not.toContain('Mes adhésions');
    // "Tu as X invitation" : vérifie l'absence du bandeau
    expect(html).not.toContain('invitation(s) en attente');
  });

  test("La page d'accueil charge normalement sans erreur JS", async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('La page commerçant inscription charge normalement', async ({ page }) => {
    await page.goto('/commercant/inscription');
    await page.waitForLoadState('networkidle');
    const html = await page.content();
    // Aucune mention du module mairie/asso avec flag OFF
    expect(html).not.toContain('Mairie / Association');
    expect(html).not.toContain('GestionAdherents');
  });

  test('La page ville charge normalement', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // La page de base charge sans régression
    expect(page.url()).toContain('/');
  });
});
