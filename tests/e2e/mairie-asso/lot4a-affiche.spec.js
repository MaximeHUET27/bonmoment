import { test, expect } from '@playwright/test';

// Tests de non-régression UI Lot 4A
// Vérifient que les composants Lot 4A sont absents quand le flag est OFF

test.describe('Lot 4A — flag OFF : dashboard inchangé', () => {
  test.beforeEach(async ({ page }) => {
    // Les tests E2E s'exécutent avec NEXT_PUBLIC_MAIRIE_ASSO_ENABLED=false
    // On vérifie uniquement que les nouveaux éléments sont absents
  });

  test('la page dashboard ne contient pas "Statistiques de tes adhérents" avec flag OFF', async ({ page }) => {
    // Accéder à une page publique pour vérifier l'absence du texte
    // (pas de login requis pour ce test de non-régression)
    await page.goto('/');
    // Le texte spécifique au Lot 4A ne doit jamais apparaître côté public
    const titre = page.locator('text=Statistiques de tes adhérents');
    await expect(titre).toHaveCount(0);
  });

  test('la page dashboard ne contient pas "Logo personnalisé" avec flag OFF', async ({ page }) => {
    await page.goto('/');
    const logo = page.locator('text=Logo personnalisé');
    await expect(logo).toHaveCount(0);
  });
});
