const { test, expect } = require('@playwright/test');
const { gotoWithSave, dateKey } = require('./helpers');

// Note : sur une sauvegarde neuve (lastLoginDate null), fermer l'intro enchaîne
// automatiquement sur le bonus de connexion (voir login-bonus.spec.js et
// bootstrapModals()/finishOnboarding() dans ui.js). Pour isoler le comportement
// de l'intro seule, ces tests fixent lastLoginDate à aujourd'hui : le bonus a
// déjà été réclamé, il ne peut donc pas s'enchaîner et masquer l'assertion.

test.describe('Introduction pour les nouveaux joueurs', () => {
  test('affichée à la toute première visite (aucune sauvegarde)', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('.onboarding h2')).toHaveText('Bienvenue chez Antho !');
  });

  test('"Passer l\'intro" ferme la modale et persiste l\'état', async ({ page }) => {
    await gotoWithSave(page, { onboardingDone: false, lastLoginDate: dateKey(0) });
    await page.click('button:has-text("Passer l\'intro")');
    await expect(page.locator('#modalOverlay')).toHaveClass(/hidden/);
    const done = await page.evaluate(() => state.onboardingDone);
    expect(done).toBe(true);
  });

  test('ne réapparaît pas une fois faite', async ({ page }) => {
    await gotoWithSave(page, { onboardingDone: true, lastLoginDate: dateKey(0) });
    const modalVisible = await page.locator('#modalOverlay').evaluate((el) => !el.classList.contains('hidden'));
    expect(modalVisible).toBe(false);
  });

  test('navigation "Suivant" jusqu\'au bouton final', async ({ page }) => {
    await gotoWithSave(page, { onboardingDone: false, lastLoginDate: dateKey(0) });
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Suivant")');
    }
    await expect(page.locator('.modal-actions button.primary')).toHaveText(/C'est parti/);
    await page.click('.modal-actions button.primary');
    await expect(page.locator('#modalOverlay')).toHaveClass(/hidden/);
  });

  test('chaîne vers le bonus de connexion sur une toute première visite', async ({ page }) => {
    await page.goto('/index.html');
    await page.click('button:has-text("Passer l\'intro")');
    await expect(page.locator('#modalContent')).toContainText('Bonus de connexion');
  });
});
