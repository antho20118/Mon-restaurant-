const { test, expect } = require('@playwright/test');
const { gotoWithSave, SAVE_KEY } = require('./helpers');

test.describe('Protection multi-onglets', () => {
  test('une modification détectée dans un autre onglet arrête la sauvegarde locale et prévient', async ({ page }) => {
    await gotoWithSave(page); // baseSave() par défaut : money = 500

    // L'événement "storage" ne se déclenche jamais dans l'onglet qui écrit lui-même ;
    // on le simule ici pour imiter un autre onglet qui vient de sauvegarder.
    await page.evaluate((key) => {
      window.dispatchEvent(new StorageEvent('storage', { key, newValue: 'x' }));
    }, SAVE_KEY);

    await expect(page.locator('#toastContainer')).toContainText('autre onglet');

    // Toute mutation faite depuis cet onglet ne doit plus écraser la sauvegarde partagée.
    await page.evaluate(() => { state.money = 999999; saveState(); });
    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).money, SAVE_KEY);
    expect(stored).toBe(500);
  });
});
