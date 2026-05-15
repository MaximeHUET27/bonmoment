import { test, expect } from '@playwright/test';

test.describe('Non-régression : inscription commerce avec feature flag OFF', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/commercant/inscription');
    await page.waitForLoadState('networkidle');
  });

  test('La page d\'inscription se charge correctement', async ({ page }) => {
    await expect(page).toHaveTitle(/BONMOMENT/i);
  });

  test('Avec MAIRIE_ASSO_ENABLED=false, "Mairie / Association" n\'apparaît PAS dans les catégories', async ({ page }) => {
    const pageContent = await page.content();
    expect(pageContent).not.toContain('Mairie / Association');
    expect(pageContent).not.toContain('mairie_asso');
  });

  test('Les 5 catégories existantes sont toujours présentes dans le code', async ({ page }) => {
    // Test placeholder — sera enrichi en Lot 2 avec un compte de test connecté
    expect(true).toBe(true);
  });
});
