#!/usr/bin/env node
// Playtest simulé : fait jouer le VRAI jeu (pas une réimplémentation des règles) par un
// bot qui prend des décisions raisonnables, sur plusieurs journées et plusieurs parties
// indépendantes, pour observer comment l'équilibrage se comporte dans la durée.
//
// Astuce clé : tick() avance l'état d'un pas FIXE de TICK_MS (100ms), quelle que soit la
// durée réelle écoulée. On peut donc appeler tick() en boucle serrée dans la page (au lieu
// d'attendre le setInterval du jeu), et compresser une journée entière de service en
// quelques millisecondes au lieu de ~1 minute réelle.
//
// Usage : node scripts/simulate-playtest.js [nbParties] [nbJours]
//   npm run simulate            -> 5 parties de 40 jours (par défaut)
//   npm run simulate -- 10 60   -> 10 parties de 60 jours

const path = require('path');
const http = require('http');
const fs = require('fs');
const { chromium } = require('@playwright/test');

const ROOT = path.join(__dirname, '..');
const PORT = 8199;

const RUNS = parseInt(process.argv[2], 10) || 5;
const DAYS = parseInt(process.argv[3], 10) || 40;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (filePath.endsWith('/')) filePath = path.join(filePath, 'index.html');
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(PORT, () => resolve(server));
  });
}

// Politique du bot : injectée et exécutée entièrement dans la page, en s'appuyant
// uniquement sur les fonctions/état réels du jeu (game.js / data.js), jamais réimplémentés.
const BOT_SCRIPT = `
function botPickRecipeForStation() {
  const demand = {};
  runtime.customers.forEach((c) => {
    c.order.forEach((id) => { if (!c.served.includes(id)) demand[id] = (demand[id] || 0) + 1; });
  });
  let best = null, bestCount = -1;
  state.unlockedRecipes.forEach((id) => {
    const cnt = demand[id] || 0;
    if (cnt > bestCount) { bestCount = cnt; best = id; }
  });
  if (bestCount <= 0 && state.unlockedRecipes.length) {
    return state.unlockedRecipes[Math.floor(Math.random() * state.unlockedRecipes.length)];
  }
  return best;
}

function botAssignStations() {
  runtime.stations.forEach((st, idx) => {
    if (st.busy) return;
    const recipeId = botPickRecipeForStation();
    if (recipeId) startCookingStation(idx, recipeId);
  });
}

// Timing imparfait volontaire (simule un humain qui ne clique pas au tick près).
function botDressStations() {
  runtime.stations.forEach((st, idx) => {
    if (!st.busy) return;
    if (st.progress >= 0.75 && st.progress < 0.95) {
      if (Math.random() < 0.45) onDressClick(idx);
    } else if (st.progress >= 0.95) {
      if (Math.random() < 0.8) onDressClick(idx);
    } else if (st.progress > 0.55 && Math.random() < 0.02) {
      onDressClick(idx); // fausse manœuvre occasionnelle -> "raté"
    }
  });
}

function botServeDishes() {
  while (runtime.readyDishes.length > 0) serveDish(runtime.readyDishes[0].id);
}

// Achats gloutons : à chaque tour, débloque l'amélioration abordable la moins chère
// (recette > décoration > équipement de vitesse > place > poste de cuisson), et répète.
function botSpendMoney() {
  let bought = true;
  while (bought) {
    bought = false;
    const level = computeLevel(state.totalRevenue);
    const options = [];
    RECIPES.filter((r) => !r.event && !state.unlockedRecipes.includes(r.id) && level >= r.unlockLevel)
      .forEach((r) => options.push({ cost: r.unlockCost, action: () => buyRecipe(r.id) }));
    DECOR_ITEMS.filter((d) => !state.purchasedDecor.includes(d.id) && level >= d.unlockLevel)
      .forEach((d) => options.push({ cost: d.cost, action: () => buyDecor(d.id) }));
    SPEED_ITEMS.filter((s) => !state.purchasedSpeed.includes(s.id) && level >= s.unlockLevel)
      .forEach((s) => options.push({ cost: s.cost, action: () => buySpeedItem(s.id) }));
    if (state.seats < MAX_SEATS && SEAT_UPGRADE_COST[state.seats] !== undefined) {
      options.push({ cost: SEAT_UPGRADE_COST[state.seats], action: () => buySeat() });
    }
    if (state.stations < MAX_STATIONS && STATION_UPGRADE_COST[state.stations] !== undefined) {
      options.push({ cost: STATION_UPGRADE_COST[state.stations], action: () => buyStation() });
    }
    options.sort((a, b) => a.cost - b.cost);
    for (const opt of options) {
      if (state.money >= opt.cost) { opt.action(); bought = true; break; }
    }
  }
}

function resetForSim() {
  localStorage.removeItem(SAVE_KEY);
  state = defaultState();
  state.dailyChallenge = pickDailyChallenge();
  runtime = {
    active: false, paused: false, dayDuration: 0, dayTimeLeft: 0, spawnTimer: 0,
    nextCustomerId: 1, nextDishId: 1, customers: [], stations: [], readyDishes: [],
    stats: { served: 0, missed: 0, revenue: 0, perfectCount: 0, comboCount: 0 },
  };
  initStations();
}

function simulateOneDay() {
  startDay();
  let guard = 0;
  while (runtime.active && guard < 5000) {
    botAssignStations();
    botDressStations();
    botServeDishes();
    tick();
    guard++;
  }
  return guard;
}

function runSimulation(days) {
  resetForSim();
  const history = [];
  for (let i = 0; i < days; i++) {
    botSpendMoney();
    const dayBefore = state.day;
    const challengeBefore = state.dailyChallenge;
    simulateOneDay();
    history.push({
      day: dayBefore,
      level: computeLevel(state.totalRevenue),
      money: Math.round(state.money * 100) / 100,
      totalRevenue: Math.round(state.totalRevenue * 100) / 100,
      reputation: Math.round(state.reputation * 100) / 100,
      served: runtime.stats.served,
      missed: runtime.stats.missed,
      perfectCount: runtime.stats.perfectCount,
      comboCount: runtime.stats.comboCount,
      revenue: Math.round(runtime.stats.revenue * 100) / 100,
      unlockedRecipes: state.unlockedRecipes.length,
      stations: state.stations,
      seats: state.seats,
      challengeSuccess: challengeSucceeded(challengeBefore),
    });
  }
  return history;
}
`;

async function main() {
  const server = await startServer();
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  try {
    const page = await browser.newPage();
    page.on('pageerror', (err) => console.error('[pageerror]', err));
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 200)));
    // Un <script> classique (pas un module) attache ses déclarations `function` à `window`,
    // ce que page.evaluate() ne permet pas pour une chaîne à plusieurs déclarations.
    await page.addScriptTag({ content: BOT_SCRIPT });

    console.log(`Playtest simulé : ${RUNS} partie(s) indépendante(s) x ${DAYS} jours simulés chacune.\n`);

    const allRuns = [];
    for (let r = 0; r < RUNS; r++) {
      const t0 = Date.now();
      const history = await page.evaluate((days) => runSimulation(days), DAYS);
      const elapsed = Date.now() - t0;
      allRuns.push(history);
      const last = history[history.length - 1];
      console.log(
        `Partie ${r + 1}/${RUNS} (${elapsed}ms réels pour ${DAYS} jours simulés) -> ` +
        `niveau ${last.level}, ${last.money}€ en caisse, ${last.unlockedRecipes} recettes, ` +
        `${last.stations} postes, ${last.seats} places, réputation ${last.reputation}★`
      );
    }

    const nonEventRecipeCount = await page.evaluate(() => RECIPES.filter((r) => !r.event).length);
    printAggregateReport(allRuns, nonEventRecipeCount);
    writeJsonReport(allRuns);
  } finally {
    await browser.close();
    server.close();
  }
}

function avg(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }

function printAggregateReport(allRuns, nonEventRecipeCount) {
  console.log('\n--- Rapport agrégé (moyennes sur toutes les parties) ---\n');
  console.log('Jour | Niveau | Argent(€) | Servis | Ratés | %Ratés | Défi réussi | Réputation');
  for (let d = 0; d < DAYS; d++) {
    const rows = allRuns.map((h) => h[d]).filter(Boolean);
    if (!rows.length) continue;
    const level = avg(rows.map((x) => x.level)).toFixed(1);
    const money = avg(rows.map((x) => x.money)).toFixed(0);
    const served = avg(rows.map((x) => x.served)).toFixed(1);
    const missed = avg(rows.map((x) => x.missed)).toFixed(1);
    const missRate = (avg(rows.map((x) => x.missed / Math.max(1, x.served + x.missed))) * 100).toFixed(1);
    const challengeRate = (avg(rows.map((x) => (x.challengeSuccess ? 1 : 0))) * 100).toFixed(0);
    const rep = avg(rows.map((x) => x.reputation)).toFixed(2);
    if (d % 5 === 0 || d === DAYS - 1) {
      console.log(`${String(d + 1).padStart(4)} | ${level.padStart(6)} | ${money.padStart(9)} | ${served.padStart(6)} | ${missed.padStart(5)} | ${missRate.padStart(6)}% | ${challengeRate.padStart(10)}% | ${rep}`);
    }
  }

  const finalLevels = allRuns.map((h) => h[h.length - 1].level);
  const finalRecipes = allRuns.map((h) => h[h.length - 1].unlockedRecipes);
  console.log(`\nNiveau final moyen après ${DAYS} jours : ${avg(finalLevels).toFixed(2)} (min ${Math.min(...finalLevels)}, max ${Math.max(...finalLevels)})`);
  console.log(`Recettes débloquées en moyenne : ${avg(finalRecipes).toFixed(1)} / ${nonEventRecipeCount} recettes non-événement`);

  const earlyMissRates = allRuns.map((h) => {
    const first5 = h.slice(0, 5);
    return avg(first5.map((x) => x.missed / Math.max(1, x.served + x.missed)));
  });
  console.log(`Taux de clients perdus sur les 5 premiers jours (en moyenne) : ${(avg(earlyMissRates) * 100).toFixed(1)}%`);
}

function writeJsonReport(allRuns) {
  const outPath = path.join(ROOT, 'scripts', 'last-simulation-report.json');
  fs.writeFileSync(outPath, JSON.stringify({ runs: RUNS, days: DAYS, generatedAt: new Date().toISOString(), history: allRuns }, null, 2));
  console.log(`\nDonnées détaillées écrites dans ${path.relative(ROOT, outPath)}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
