const { test, expect } = require('@playwright/test');
const { gotoWithSave } = require('./helpers');

test.describe('Menus combo (entrée + plat)', () => {
  test('un client "menu" reste à table après le premier plat et part avec un bonus après le second', async ({ page }) => {
    await gotoWithSave(page, {
      totalRevenue: 3200, // niveau 5, au-delà du seuil des combos (niveau 4)
      unlockedRecipes: ['salade_cesar', 'soupe_oignon', 'steak_frites', 'ratatouille', 'creme_brulee'],
    });
    await page.click('#btnStartDay');

    await page.evaluate(() => {
      runtime.customers.push({
        id: runtime.nextCustomerId++,
        order: ['soupe_oignon', 'ratatouille'],
        served: [],
        patienceMax: 60000,
        patienceLeft: 60000,
      });
    });

    // Sert le premier plat du menu.
    const step1 = await page.evaluate(() => {
      const idx = runtime.stations.findIndex((s) => !s.busy);
      startCookingStation(idx, 'soupe_oignon');
      runtime.stations[idx].progress = 0.85;
      onDressClick(idx);
      const dish = runtime.readyDishes[runtime.readyDishes.length - 1];
      const before = state.money;
      const result = serveDish(dish.id);
      return { comboCompleted: result.comboCompleted, customersLeft: runtime.customers.length, moneyGain: state.money - before };
    });
    expect(step1.comboCompleted).toBe(false);
    expect(step1.customersLeft).toBe(1); // le client reste à table
    expect(step1.moneyGain).toBeGreaterThan(0);

    // Sert le second plat : le client doit partir, avec le bonus de menu complet.
    const step2 = await page.evaluate(() => {
      const idx = runtime.stations.findIndex((s) => !s.busy);
      startCookingStation(idx, 'ratatouille');
      runtime.stations[idx].progress = 0.85;
      onDressClick(idx);
      const dish = runtime.readyDishes[runtime.readyDishes.length - 1];
      const result = serveDish(dish.id);
      return { comboCompleted: result.comboCompleted, customersLeft: runtime.customers.length, servedCount: runtime.stats.served, comboBonus: result.comboBonus };
    });
    expect(step2.comboCompleted).toBe(true);
    expect(step2.customersLeft).toBe(0);
    expect(step2.servedCount).toBe(1); // un menu complet compte pour UN client servi, pas deux
    expect(step2.comboBonus).toBeGreaterThan(0);
  });
});
