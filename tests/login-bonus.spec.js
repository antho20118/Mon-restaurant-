const { test, expect } = require('@playwright/test');
const { gotoWithSave, dateKey } = require('./helpers');

test.describe('Bonus de connexion quotidien', () => {
  test('première visite : bonus offert, série à 1', async ({ page }) => {
    await gotoWithSave(page, { lastLoginDate: null, loginStreak: 0 });
    await expect(page.locator('#modalContent')).toContainText('Bonus de connexion');
    await expect(page.locator('#modalContent')).toContainText('Premier jour');
    const streak = await page.evaluate(() => state.loginStreak);
    expect(streak).toBe(1);
  });

  test('déjà réclamé aujourd\'hui : aucune modale', async ({ page }) => {
    await gotoWithSave(page, { lastLoginDate: dateKey(0), loginStreak: 1 });
    await expect(page.locator('#modalOverlay')).toHaveClass(/hidden/);
  });

  test('jour consécutif : la série augmente et la récompense grandit', async ({ page }) => {
    const moneyStart = 100;
    await gotoWithSave(page, { lastLoginDate: dateKey(-1), loginStreak: 1, money: moneyStart });
    await expect(page.locator('#modalContent')).toContainText('2 jours de suite');
    const [streak, money] = await page.evaluate(() => [state.loginStreak, state.money]);
    expect(streak).toBe(2);
    expect(money).toBe(moneyStart + 30); // LOGIN_BONUS_REWARDS[1] = 30
  });

  test('interruption de plusieurs jours : la série repart à 1', async ({ page }) => {
    await gotoWithSave(page, { lastLoginDate: dateKey(-3), loginStreak: 5 });
    await expect(page.locator('#modalContent')).toContainText('Premier jour');
    const streak = await page.evaluate(() => state.loginStreak);
    expect(streak).toBe(1);
  });
});
