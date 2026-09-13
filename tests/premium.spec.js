const { test, expect } = require('@playwright/test');
const { gotoWithSave } = require('./helpers');

test.describe('Simulation d\'achats en argent réel', () => {
  test('affiche l\'avertissement de simulation, jamais de vrai formulaire de paiement', async ({ page }) => {
    await gotoWithSave(page);
    await page.click('#btnShop');
    await page.click('.tab:has-text("Premium")');
    await expect(page.locator('.premium-disclaimer')).toContainText('Simulation');
    await expect(page.locator('.premium-disclaimer')).toContainText('aucun paiement réel');
    // Aucun champ de saisie (numéro de carte, etc.) ne doit exister dans cet onglet.
    await expect(page.locator('#modalContent input')).toHaveCount(0);
  });

  test('recharger le portefeuille de démo puis acheter un pack de pièces', async ({ page }) => {
    await gotoWithSave(page, { money: 100, premiumWalletDemo: 0 });
    await page.click('#btnShop');
    await page.click('.tab:has-text("Premium")');

    await page.click('button:has-text("Recharger 9,99")');
    await expect(page.locator('.premium-wallet')).toContainText('9.99');

    const moneyBefore = await page.evaluate(() => state.money);
    await page.click('.shop-list button:has-text("4.99$")'); // Petite caisse : +500€
    await page.waitForTimeout(100);
    const moneyAfter = await page.evaluate(() => state.money);
    expect(moneyAfter - moneyBefore).toBe(500);
  });

  test('le pack géant crédite le plus gros montant et affiche son badge', async ({ page }) => {
    await gotoWithSave(page, { premiumWalletDemo: 60 });
    await page.click('#btnShop');
    await page.click('.tab:has-text("Premium")');

    await expect(page.locator('.pack-badge')).toContainText('Meilleure offre');
    const moneyBefore = await page.evaluate(() => state.money);
    await page.click('button:has-text("49.99$")');
    await page.waitForTimeout(100);
    const moneyAfter = await page.evaluate(() => state.money);
    expect(moneyAfter - moneyBefore).toBe(9000);
  });

  test('le pass permanent ajoute un bonus de pourboire durable', async ({ page }) => {
    await gotoWithSave(page, { premiumWalletDemo: 10 });
    await page.click('#btnShop');
    await page.click('.tab:has-text("Premium")');

    const tipBefore = await page.evaluate(() => tipMultiplier());
    await page.click('button:has-text("6.99$")');
    await page.waitForTimeout(100);
    const tipAfter = await page.evaluate(() => tipMultiplier());
    expect(tipAfter).toBeCloseTo(tipBefore + 0.10, 5);
  });

  test('un solde de démo insuffisant refuse l\'achat sans rien débiter', async ({ page }) => {
    await gotoWithSave(page, { premiumWalletDemo: 0, money: 20 });
    await page.click('#btnShop');
    await page.click('.tab:has-text("Premium")');

    const moneyBefore = await page.evaluate(() => state.money);
    await page.click('.shop-list button:has-text("4.99$")');
    await page.waitForTimeout(100);
    const moneyAfter = await page.evaluate(() => state.money);
    expect(moneyAfter).toBe(moneyBefore);
  });

  test('déblocage instantané (⚡) donne accès à une recette sans attendre le niveau requis', async ({ page }) => {
    await gotoWithSave(page, { premiumWalletDemo: 10, totalRevenue: 0 }); // niveau 1 : soupe_oignon (niveau 2) normalement verrouillée
    await page.click('#btnShop');

    const unlockedBefore = await page.evaluate(() => state.unlockedRecipes.includes('soupe_oignon'));
    expect(unlockedBefore).toBe(false);

    await page.click('button.instant[onclick*="soupe_oignon"]');
    await page.waitForTimeout(100);

    const unlockedAfter = await page.evaluate(() => state.unlockedRecipes.includes('soupe_oignon'));
    expect(unlockedAfter).toBe(true);
  });
});
