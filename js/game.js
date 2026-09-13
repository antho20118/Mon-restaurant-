// Logique du jeu — "Chez Antho", simulateur de restaurant.
// Boucle : les clients commandent -> on cuisine en station (mini-jeu de timing) -> on sert -> on développe le restaurant.

const SAVE_KEY = 'restauTycoonSave_v1';
const TICK_MS = 100;

function defaultState() {
  return {
    restaurantName: 'Chez Antho',
    money: 80,
    day: 1,
    totalRevenue: 0,
    reputation: 3.0,
    unlockedRecipes: RECIPES.filter(r => r.unlockCost === 0 && !r.event).map(r => r.id),
    stations: 1,
    seats: 3,
    purchasedDecor: [],
    purchasedSpeed: [],
    activeEvents: [],
    soundEnabled: true,
    onboardingDone: false,
    dailyChallenge: null,
  };
}

let state = loadState();

let runtime = {
  active: false,
  paused: false,
  dayDuration: 0,
  dayTimeLeft: 0,
  spawnTimer: 0,
  nextCustomerId: 1,
  nextDishId: 1,
  customers: [],
  stations: [],
  readyDishes: [],
  stats: { served: 0, missed: 0, revenue: 0, perfectCount: 0, comboCount: 0 },
};

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed);
    }
  } catch (e) { /* sauvegarde corrompue -> on repart de zéro */ }
  return defaultState();
}

function saveState() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* stockage indisponible */ }
}

function recipeById(id) { return RECIPES.find(r => r.id === id); }

function computeLevel(totalRevenue) {
  for (let lvl = LEVEL_THRESHOLDS.length - 1; lvl >= 1; lvl--) {
    if (totalRevenue >= LEVEL_THRESHOLDS[lvl]) return lvl;
  }
  return 1;
}

function tipMultiplier() {
  let mult = 1;
  state.purchasedDecor.forEach(id => {
    const item = DECOR_ITEMS.find(d => d.id === id);
    if (item) mult += item.tipBonus;
  });
  state.activeEvents.forEach(id => {
    const event = SEASONAL_EVENTS.find(e => e.id === id);
    if (event) mult += event.tipBonus;
  });
  return mult;
}

function cookSpeedMultiplier() {
  let mult = 1;
  state.purchasedSpeed.forEach(id => {
    const item = SPEED_ITEMS.find(s => s.id === id);
    if (item) mult -= item.speedBonus;
  });
  return Math.max(0.5, mult);
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function starString(rep) {
  const full = Math.round(rep);
  return '⭐'.repeat(clamp(full, 0, 5)) + '☆'.repeat(clamp(5 - full, 0, 5));
}

// ---------- Défi du jour ----------

function pickDailyChallenge() {
  const level = computeLevel(state.totalRevenue);
  const eligible = CHALLENGE_TYPES.filter(c => !c.minLevel || level >= c.minLevel);
  const type = eligible[Math.floor(Math.random() * eligible.length)];
  const target = Math.round(type.baseTarget + type.perLevel * (level - 1));
  const reward = Math.round(CHALLENGE_REWARD_BASE + CHALLENGE_REWARD_PER_LEVEL * (level - 1));
  return { typeId: type.id, target, reward };
}

function challengeProgressValue(challenge) {
  switch (challenge.typeId) {
    case 'serve_count': return runtime.stats.served;
    case 'serve_perfect': return runtime.stats.perfectCount;
    case 'no_miss': return runtime.stats.missed;
    case 'earn_money': return runtime.stats.revenue;
    case 'combo_count': return runtime.stats.comboCount;
    default: return 0;
  }
}

function challengeSucceeded(challenge) {
  if (!challenge) return false;
  if (challenge.typeId === 'no_miss') return runtime.stats.missed <= challenge.target;
  return challengeProgressValue(challenge) >= challenge.target;
}

// ---------- Cycle de service ----------

function initStations() {
  const current = runtime.stations.length;
  for (let i = current; i < state.stations; i++) {
    runtime.stations.push({ busy: false, recipeId: null, progress: 0, cookTime: 0 });
  }
}

function computeDayDuration() {
  return 55000 + Math.min(state.day, 10) * 1500;
}

function computeSpawnInterval() {
  const base = 4500 - state.reputation * 350;
  const jitter = base * (0.8 + Math.random() * 0.4);
  return clamp(jitter, 1200, 4500);
}

function startDay() {
  closeModal();
  initStations();
  runtime.active = true;
  runtime.paused = false;
  runtime.stats = { served: 0, missed: 0, revenue: 0, perfectCount: 0, comboCount: 0 };
  runtime.customers = [];
  runtime.readyDishes = [];
  runtime.stations.forEach(st => { st.busy = false; st.recipeId = null; st.progress = 0; });
  runtime.dayDuration = computeDayDuration();
  runtime.dayTimeLeft = runtime.dayDuration;
  runtime.spawnTimer = 800;
  playSound('start');
  render();
}

function anyStationBusy() {
  return runtime.stations.some(st => st.busy);
}

function endDay() {
  runtime.active = false;
  const levelBefore = computeLevel(state.totalRevenue);
  const finishedDay = state.day;
  const challenge = state.dailyChallenge;
  const challengeSuccess = challengeSucceeded(challenge);
  if (challenge && challengeSuccess) {
    state.money = Math.round((state.money + challenge.reward) * 100) / 100;
  }
  state.day++;
  state.dailyChallenge = pickDailyChallenge();
  saveState();
  showDaySummary(levelBefore, finishedDay, challenge, challengeSuccess);
}

function pickComboOrder() {
  const entrees = state.unlockedRecipes.filter(id => recipeById(id).cat === 'entree');
  const plats = state.unlockedRecipes.filter(id => recipeById(id).cat === 'plat');
  if (entrees.length === 0 || plats.length === 0) return null;
  const entree = entrees[Math.floor(Math.random() * entrees.length)];
  const plat = plats[Math.floor(Math.random() * plats.length)];
  return [entree, plat];
}

function spawnCustomer() {
  const pool = state.unlockedRecipes;
  if (pool.length === 0) return;

  const level = computeLevel(state.totalRevenue);
  let order = null;
  if (level >= COMBO_MIN_LEVEL && Math.random() < COMBO_CHANCE) {
    order = pickComboOrder();
  }
  if (!order) {
    order = [pool[Math.floor(Math.random() * pool.length)]];
  }

  let patienceMax = clamp(22000 + (Math.random() * 6000 - 3000) + state.reputation * 800, 10000, 40000);
  if (order.length > 1) patienceMax *= COMBO_PATIENCE_FACTOR;

  runtime.customers.push({
    id: runtime.nextCustomerId++,
    order,
    served: [],
    patienceMax,
    patienceLeft: patienceMax,
  });
}

function loseCustomer(c) {
  runtime.stats.missed++;
  state.reputation = clamp(state.reputation - 0.15, 0, 5);
  const names = c.order.filter(id => !c.served.includes(id)).map(id => recipeById(id).name).join(' + ');
  toast(`😡 Un client est parti (voulait ${names || 'un plat'})`);
  playSound('lost');
}

function tick() {
  if (!runtime.active || runtime.paused) return;

  runtime.dayTimeLeft = Math.max(0, runtime.dayTimeLeft - TICK_MS);
  runtime.spawnTimer -= TICK_MS;

  if (runtime.dayTimeLeft > 0 && runtime.spawnTimer <= 0 && runtime.customers.length < state.seats) {
    spawnCustomer();
    runtime.spawnTimer = computeSpawnInterval();
  }

  runtime.customers.forEach(c => { c.patienceLeft -= TICK_MS; });
  const expired = runtime.customers.filter(c => c.patienceLeft <= 0);
  if (expired.length) {
    expired.forEach(loseCustomer);
    runtime.customers = runtime.customers.filter(c => c.patienceLeft > 0);
    saveState();
  }

  runtime.stations.forEach(st => {
    if (st.busy) {
      st.progress += TICK_MS / st.cookTime;
      if (st.progress >= 1) {
        finishCooking(st, 'bon');
      }
    }
  });

  if (runtime.dayTimeLeft <= 0 && runtime.customers.length === 0 && !anyStationBusy()) {
    endDay();
  }

  render();
}

// ---------- Cuisine ----------

function startCookingStation(stationIndex, recipeId) {
  const st = runtime.stations[stationIndex];
  const recipe = recipeById(recipeId);
  if (!st || st.busy || !recipe) return;
  st.busy = true;
  st.recipeId = recipeId;
  st.progress = 0;
  st.cookTime = recipe.cookTime * cookSpeedMultiplier();
  if (recipe.special === 'pizza') playSound('pizza');
  closeModal();
  render();
}

function finishCooking(st, quality) {
  runtime.readyDishes.push({ id: runtime.nextDishId++, recipeId: st.recipeId, quality });
  st.busy = false;
  st.recipeId = null;
  st.progress = 0;
}

function onDressClick(stationIndex) {
  const st = runtime.stations[stationIndex];
  if (!st || !st.busy) return;
  let quality;
  if (st.progress < 0.75) quality = 'rate';
  else if (st.progress < 0.95) quality = 'parfait';
  else quality = 'bon';
  if (quality === 'parfait') runtime.stats.perfectCount++;
  finishCooking(st, quality);
  render();
  return quality;
}

// ---------- Service ----------

function serveDish(dishId) {
  const dishIdx = runtime.readyDishes.findIndex(d => d.id === dishId);
  if (dishIdx === -1) return;
  const dish = runtime.readyDishes[dishIdx];
  const recipe = recipeById(dish.recipeId);
  const qualityInfo = QUALITY[dish.quality];

  let candidate = null;
  runtime.customers.forEach(c => {
    if (c.order.includes(dish.recipeId) && !c.served.includes(dish.recipeId)) {
      if (!candidate || c.patienceLeft < candidate.patienceLeft) candidate = c;
    }
  });

  let pay, repChange, msg;
  let comboBonus = 0;
  let comboCompleted = false;
  if (candidate) {
    const patienceRatio = clamp(candidate.patienceLeft / candidate.patienceMax, 0, 1);
    pay = recipe.price * qualityInfo.mult * (0.7 + 0.3 * patienceRatio) * tipMultiplier();
    repChange = patienceRatio > 0.6 ? 0.05 : (patienceRatio > 0.3 ? 0.02 : -0.02);
    if (dish.quality === 'parfait') repChange += 0.03;
    if (dish.quality === 'rate') repChange -= 0.03;

    candidate.served.push(dish.recipeId);
    const isCombo = candidate.order.length > 1;
    const complete = candidate.order.every(id => candidate.served.includes(id));

    if (complete) {
      runtime.customers = runtime.customers.filter(c => c.id !== candidate.id);
    }
    msg = `${qualityInfo.emoji} ${recipe.name} servi${isCombo && !complete ? ' (1/2)' : ''} — +${pay.toFixed(2)}€`;

    pay = Math.round(pay * 100) / 100;
    state.money = Math.round((state.money + pay) * 100) / 100;
    state.totalRevenue += pay;
    state.reputation = clamp(state.reputation + repChange, 0, 5);
    runtime.stats.revenue += pay;

    if (complete) {
      runtime.stats.served++;
      comboCompleted = isCombo;
      if (isCombo) {
        runtime.stats.comboCount++;
        const base = candidate.order.reduce((sum, id) => sum + recipeById(id).price, 0);
        comboBonus = Math.round(base * COMBO_BONUS_RATE * tipMultiplier() * 100) / 100;
        state.money = Math.round((state.money + comboBonus) * 100) / 100;
        state.totalRevenue += comboBonus;
        runtime.stats.revenue += comboBonus;
        state.reputation = clamp(state.reputation + 0.03, 0, 5);
        toast(`🎉 Menu complet servi ! Bonus +${comboBonus.toFixed(2)}€`);
      }
    }
  } else {
    // Personne n'attend plus ce plat : on le vend quand même, à moitié prix (repas du personnel).
    pay = Math.round(recipe.price * qualityInfo.mult * 0.5 * 100) / 100;
    state.money = Math.round((state.money + pay) * 100) / 100;
    state.totalRevenue += pay;
    runtime.stats.revenue += pay;
    msg = `🍽️ ${recipe.name} non réclamé, vendu au personnel — +${pay.toFixed(2)}€`;
  }

  runtime.readyDishes.splice(dishIdx, 1);

  const newLevel = computeLevel(state.totalRevenue);
  toast(msg);
  saveState();
  render();
  return { pay: pay + comboBonus, comboBonus, comboCompleted, newLevel };
}

// ---------- Boutique ----------

function buyRecipe(id) {
  const recipe = recipeById(id);
  if (!recipe || recipe.event || state.unlockedRecipes.includes(id)) return;
  const level = computeLevel(state.totalRevenue);
  if (level < recipe.unlockLevel) { toast(`🔒 Niveau ${recipe.unlockLevel} requis`); return; }
  if (state.money < recipe.unlockCost) { toast('💸 Fonds insuffisants'); return; }
  state.money -= recipe.unlockCost;
  state.unlockedRecipes.push(id);
  toast(`✅ ${recipe.name} ajouté à la carte !`);
  saveState();
  renderShop();
  render();
}

function buyStation() {
  const cost = STATION_UPGRADE_COST[state.stations];
  if (state.stations >= MAX_STATIONS || cost === undefined) { toast('🔒 Nombre maximum de postes atteint'); return; }
  if (state.money < cost) { toast('💸 Fonds insuffisants'); return; }
  state.money -= cost;
  state.stations++;
  initStations();
  toast('🔥 Nouveau poste de cuisson installé !');
  saveState();
  renderShop();
  render();
}

function buySeat() {
  const cost = SEAT_UPGRADE_COST[state.seats];
  if (state.seats >= MAX_SEATS || cost === undefined) { toast('🔒 Nombre maximum de places atteint'); return; }
  if (state.money < cost) { toast('💸 Fonds insuffisants'); return; }
  state.money -= cost;
  state.seats++;
  toast('🪑 Une table supplémentaire est installée !');
  saveState();
  renderShop();
  render();
}

function buyDecor(id) {
  const item = DECOR_ITEMS.find(d => d.id === id);
  if (!item || state.purchasedDecor.includes(id)) return;
  const level = computeLevel(state.totalRevenue);
  if (level < item.unlockLevel) { toast(`🔒 Niveau ${item.unlockLevel} requis`); return; }
  if (state.money < item.cost) { toast('💸 Fonds insuffisants'); return; }
  state.money -= item.cost;
  state.purchasedDecor.push(id);
  if (item.repBonus) state.reputation = clamp(state.reputation + item.repBonus, 0, 5);
  toast(`✨ ${item.name} installé !`);
  saveState();
  renderShop();
  render();
}

function buySeasonalEvent(id) {
  const event = SEASONAL_EVENTS.find(e => e.id === id);
  if (!event || state.activeEvents.includes(id)) return;
  const level = computeLevel(state.totalRevenue);
  if (level < event.unlockLevel) { toast(`🔒 Niveau ${event.unlockLevel} requis`); return; }
  if (state.day < event.minDay) { toast(`🔒 Disponible à partir du jour ${event.minDay}`); return; }
  if (state.money < event.cost) { toast('💸 Fonds insuffisants'); return; }
  state.money -= event.cost;
  state.activeEvents.push(id);
  RECIPES.filter(r => r.event === id).forEach(r => {
    if (!state.unlockedRecipes.includes(r.id)) state.unlockedRecipes.push(r.id);
  });
  toast(`${event.emoji} ${event.name} activé ! Nouveaux plats sur la carte.`);
  saveState();
  renderShop();
  render();
}

function buySpeedItem(id) {
  const item = SPEED_ITEMS.find(s => s.id === id);
  if (!item || state.purchasedSpeed.includes(id)) return;
  const level = computeLevel(state.totalRevenue);
  if (level < item.unlockLevel) { toast(`🔒 Niveau ${item.unlockLevel} requis`); return; }
  if (state.money < item.cost) { toast('💸 Fonds insuffisants'); return; }
  state.money -= item.cost;
  state.purchasedSpeed.push(id);
  toast(`⚙️ ${item.name} acquis !`);
  saveState();
  renderShop();
  render();
}

function resetGame() {
  if (!confirm('Recommencer une nouvelle partie ? Toute la progression sera perdue.')) return;
  localStorage.removeItem(SAVE_KEY);
  state = defaultState();
  state.dailyChallenge = pickDailyChallenge();
  runtime = { active: false, paused: false, dayDuration: 0, dayTimeLeft: 0, spawnTimer: 0, nextCustomerId: 1, nextDishId: 1, customers: [], stations: [], readyDishes: [], stats: { served: 0, missed: 0, revenue: 0, perfectCount: 0, comboCount: 0 } };
  initStations();
  closeModal();
  render();
  maybeShowOnboarding();
}

// Démarrage
if (!state.dailyChallenge) { state.dailyChallenge = pickDailyChallenge(); saveState(); }
initStations();
setInterval(tick, TICK_MS);
render();
maybeShowOnboarding();
