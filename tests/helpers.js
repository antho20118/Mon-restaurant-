// Utilitaires partagés par les tests Playwright.

const SAVE_KEY = 'restauTycoonSave_v1';

function dateKey(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function baseSave(overrides) {
  return Object.assign(
    {
      restaurantName: 'Chez Antho',
      money: 500,
      day: 1,
      totalRevenue: 0,
      reputation: 4,
      unlockedRecipes: ['salade_cesar', 'steak_frites', 'creme_brulee'],
      stations: 2,
      seats: 6,
      purchasedDecor: [],
      purchasedSpeed: [],
      activeEvents: [],
      soundEnabled: true,
      onboardingDone: true,
      dailyChallenge: null,
      lastLoginDate: dateKey(0), // même algorithme que todayKey() dans game.js (date locale, pas UTC)
      loginStreak: 1,
      premiumWalletDemo: 0,
      purchasedGamepasses: [],
    },
    overrides || {},
  );
}

// Dépose une sauvegarde dans localStorage avant le premier script de la page,
// puis navigue vers le jeu. Le jeu la charge à son démarrage (game.js: loadState()).
//
// waitUntil: 'domcontentloaded' plutôt que la valeur par défaut ('load') : la page
// charge une police Google Fonts externe, dont on n'a pas besoin pour les tests de
// logique, et dont l'attente peut être lente ou peu fiable selon le réseau — inutile
// de faire dépendre chaque test d'une ressource tierce qui n'a aucun rapport avec ce
// qui est vérifié.
async function gotoWithSave(page, overrides) {
  const save = baseSave(overrides);
  await page.addInitScript((s) => {
    localStorage.setItem('restauTycoonSave_v1', JSON.stringify(s));
  }, save);
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
}

module.exports = { SAVE_KEY, baseSave, gotoWithSave, dateKey };
