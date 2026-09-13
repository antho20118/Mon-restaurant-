const { test, expect } = require('@playwright/test');
const { gotoWithSave } = require('./helpers');

// Vérifie les deux événements saisonniers (Noël et Terrasse d'été) via la même
// infrastructure générique : les deux doivent se comporter de façon identique.
for (const eventId of ['noel', 'ete']) {
  test.describe(`Événement saisonnier : ${eventId}`, () => {
    test('listé dans la boutique, achat débloque ses recettes et augmente les pourboires', async ({ page }) => {
      await gotoWithSave(page, { money: 1000, day: 6, totalRevenue: 3200 }); // niveau 5, jour >= minDay

      const eventRecipeIds = await page.evaluate(
        (id) => RECIPES.filter((r) => r.event === id).map((r) => r.id),
        eventId,
      );
      expect(eventRecipeIds.length).toBeGreaterThan(0);

      const noneUnlockedYet = await page.evaluate(
        (ids) => ids.every((id) => !state.unlockedRecipes.includes(id)),
        eventRecipeIds,
      );
      expect(noneUnlockedYet).toBe(true);

      await page.click('#btnShop');
      await page.click('.tab:has-text("Événement")');

      const eventName = await page.evaluate((id) => SEASONAL_EVENTS.find((e) => e.id === id).name, eventId);
      await expect(page.locator('.shop-item', { hasText: eventName })).toBeVisible();

      const tipBefore = await page.evaluate(() => tipMultiplier());
      const moneyBefore = await page.evaluate(() => state.money);

      await page.evaluate((id) => buySeasonalEvent(id), eventId);
      await page.waitForTimeout(100);

      const allUnlockedNow = await page.evaluate(
        (ids) => ids.every((id) => state.unlockedRecipes.includes(id)),
        eventRecipeIds,
      );
      expect(allUnlockedNow).toBe(true);

      const tipAfter = await page.evaluate(() => tipMultiplier());
      expect(tipAfter).toBeGreaterThan(tipBefore);

      const moneyAfter = await page.evaluate(() => state.money);
      expect(moneyAfter).toBeLessThan(moneyBefore);

      const isActive = await page.evaluate((id) => state.activeEvents.includes(id), eventId);
      expect(isActive).toBe(true);
    });

    test('refusé avant le niveau ou le jour requis', async ({ page }) => {
      await gotoWithSave(page, { money: 1000, day: 1, totalRevenue: 0 }); // niveau 1, jour 1

      const moneyBefore = await page.evaluate(() => state.money);
      await page.evaluate((id) => buySeasonalEvent(id), eventId);
      await page.waitForTimeout(100);

      const isActive = await page.evaluate((id) => state.activeEvents.includes(id), eventId);
      const moneyAfter = await page.evaluate(() => state.money);
      expect(isActive).toBe(false);
      expect(moneyAfter).toBe(moneyBefore);
    });
  });
}
