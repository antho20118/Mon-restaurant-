const { test, expect } = require('@playwright/test');
const { gotoWithSave } = require('./helpers');

test.describe('Défi du jour', () => {
  test('un défi est prêt dès le chargement et affiché dans le bandeau', async ({ page }) => {
    await gotoWithSave(page, { dailyChallenge: null });
    const challenge = await page.evaluate(() => state.dailyChallenge);
    expect(challenge).toBeTruthy();
    await expect(page.locator('#challengeBar')).toContainText('Défi du jour');
  });

  test('réussir le défi crédite la récompense et en génère un nouveau pour le lendemain', async ({ page }) => {
    await gotoWithSave(page, { dailyChallenge: { typeId: 'serve_count', target: 1, reward: 42 } });
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
    // { force: true } : #readyList est entièrement redessiné à chaque tick (100ms).
    await page.click('.dish-card', { force: true });
    await expect(page.locator('#challengeBar')).toContainText('1/1');

    const moneyBeforeEnd = await page.evaluate(() => state.money);
    await page.evaluate(() => {
      runtime.dayTimeLeft = 0;
      runtime.customers = [];
    });
    await page.waitForTimeout(300);

    await expect(page.locator('#modalContent')).toContainText('Défi réussi');
    const moneyAfterEnd = await page.evaluate(() => state.money);
    expect(moneyAfterEnd - moneyBeforeEnd).toBeCloseTo(42, 2);

    const nextChallenge = await page.evaluate(() => state.dailyChallenge);
    expect(nextChallenge).toBeTruthy();
  });

  test('un défi manqué est annoncé comme tel, sans récompense', async ({ page }) => {
    await gotoWithSave(page, { dailyChallenge: { typeId: 'serve_count', target: 50, reward: 42 } });
    await page.click('#btnStartDay');

    const moneyBeforeEnd = await page.evaluate(() => state.money);
    await page.evaluate(() => {
      runtime.dayTimeLeft = 0;
      runtime.customers = [];
    });
    await page.waitForTimeout(300);

    await expect(page.locator('#modalContent')).toContainText('Défi manqué');
    const moneyAfterEnd = await page.evaluate(() => state.money);
    expect(moneyAfterEnd).toBe(moneyBeforeEnd);
  });
});
