const { test, expect } = require('@playwright/test');
const { gotoWithSave } = require('./helpers');

test.describe('Boucle de jeu principale', () => {
  test('cuisson: le moment du dressage détermine la qualité', async ({ page }) => {
    await gotoWithSave(page, { dailyChallenge: { typeId: 'serve_count', target: 999, reward: 0 } });
    await page.click('#btnStartDay');
    await expect(page.locator('#btnStartDay')).toBeDisabled();

    // Dressage trop tôt (< 75% de la cuisson) -> "Raté"
    const rate = await page.evaluate(() => {
      const idx = runtime.stations.findIndex((s) => !s.busy);
      startCookingStation(idx, 'steak_frites');
      runtime.stations[idx].progress = 0.5;
      return onDressClick(idx);
    });
    expect(rate).toBe('rate');

    // Dressage dans la zone verte (75-95%) -> "Parfait"
    const parfait = await page.evaluate(() => {
      const idx = runtime.stations.findIndex((s) => !s.busy);
      startCookingStation(idx, 'steak_frites');
      runtime.stations[idx].progress = 0.85;
      return onDressClick(idx);
    });
    expect(parfait).toBe('parfait');

    const dishes = await page.evaluate(() => runtime.readyDishes.map((d) => d.quality));
    expect(dishes.sort()).toEqual(['parfait', 'rate']);
  });

  test('cuisson automatique en fin de progression -> "Bien cuit"', async ({ page }) => {
    await gotoWithSave(page);
    await page.click('#btnStartDay');

    await page.evaluate(() => {
      const idx = runtime.stations.findIndex((s) => !s.busy);
      startCookingStation(idx, 'creme_brulee');
      runtime.stations[idx].progress = 0.999; // le prochain tick (100ms) doit terminer la cuisson
    });
    await page.waitForTimeout(300);

    const dish = await page.evaluate(() => runtime.readyDishes[0]);
    expect(dish).toBeTruthy();
    expect(dish.quality).toBe('bon');
  });

  test('servir un plat rapporte de l\'argent et retire le client', async ({ page }) => {
    await gotoWithSave(page);
    await page.click('#btnStartDay');

    await page.evaluate(() => {
      runtime.customers.push({
        id: runtime.nextCustomerId++,
        order: ['steak_frites'],
        served: [],
        patienceMax: 30000,
        patienceLeft: 30000,
      });
      const idx = runtime.stations.findIndex((s) => !s.busy);
      startCookingStation(idx, 'steak_frites');
      runtime.stations[idx].progress = 0.85;
      onDressClick(idx);
    });

    await expect(page.locator('.dish-card')).toHaveCount(1);
    const moneyBefore = await page.evaluate(() => state.money);

    // { force: true } : #readyList est entièrement redessiné à chaque tick (100ms),
    // ce qui empêche les vérifications de stabilité par défaut de Playwright d'aboutir.
    await page.click('.dish-card', { force: true });
    await page.waitForTimeout(150);

    const moneyAfter = await page.evaluate(() => state.money);
    const customersLeft = await page.evaluate(() => runtime.customers.length);
    expect(moneyAfter).toBeGreaterThan(moneyBefore);
    expect(customersLeft).toBe(0);
  });

  test('un client dont la patience tombe à zéro part et pénalise la réputation', async ({ page }) => {
    await gotoWithSave(page);
    await page.click('#btnStartDay');

    const repBefore = await page.evaluate(() => state.reputation);
    await page.evaluate(() => {
      runtime.customers.push({
        id: runtime.nextCustomerId++,
        order: ['steak_frites'],
        served: [],
        patienceMax: 10000,
        patienceLeft: 50, // expirera au prochain tick
      });
    });
    await page.waitForTimeout(300);

    const repAfter = await page.evaluate(() => state.reputation);
    const customersLeft = await page.evaluate(() => runtime.customers.length);
    const missed = await page.evaluate(() => runtime.stats.missed);
    expect(customersLeft).toBe(0);
    expect(missed).toBe(1);
    expect(repAfter).toBeLessThan(repBefore);
  });
});
