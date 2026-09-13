// Rendu DOM et interactions — sépare l'affichage de la logique de jeu (game.js).

function el(id) { return document.getElementById(id); }

// ---------- Son ("juice") : synthétisé via Web Audio, aucun fichier audio à charger ----------

let audioCtx = null;

function ensureAudio() {
  if (!state.soundEnabled) return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    try { audioCtx = new Ctx(); } catch (e) { return null; }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// Débloque l'audio dès la première interaction (les navigateurs exigent un geste utilisateur).
document.addEventListener('pointerdown', ensureAudio, { once: true });

function playTone(ctx, freq, time, duration, type, peak) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, time);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(peak, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + duration + 0.02);
}

const SOUND_RECIPES = {
  good:    [[660, 0, 0.12, 'sine', 0.12]],
  parfait: [[660, 0, 0.09, 'triangle', 0.14], [880, 0.08, 0.12, 'triangle', 0.14], [1100, 0.16, 0.18, 'triangle', 0.14]],
  rate:    [[220, 0, 0.22, 'sawtooth', 0.08]],
  coin:    [[880, 0, 0.06, 'square', 0.08], [1320, 0.05, 0.1, 'square', 0.08]],
  combo:   [[660, 0, 0.1, 'triangle', 0.12], [880, 0.08, 0.1, 'triangle', 0.12], [1100, 0.16, 0.1, 'triangle', 0.12], [1320, 0.24, 0.22, 'triangle', 0.14]],
  lost:    [[300, 0, 0.1, 'sawtooth', 0.09], [220, 0.09, 0.18, 'sawtooth', 0.09]],
  levelup: [[520, 0, 0.1, 'triangle', 0.13], [660, 0.1, 0.1, 'triangle', 0.13], [780, 0.2, 0.1, 'triangle', 0.13], [1040, 0.3, 0.3, 'triangle', 0.15]],
  start:   [[440, 0, 0.15, 'sine', 0.1]],
  challenge: [[988, 0, 0.1, 'triangle', 0.13], [1318, 0.1, 0.24, 'triangle', 0.14]],
  // Petit air façon mandoline pour l'ouverture du spectacle du pizzaiolo.
  pizza: [
    [784, 0,    0.09, 'triangle', 0.1], [659, 0.1,  0.09, 'triangle', 0.1],
    [784, 0.2,  0.09, 'triangle', 0.1], [659, 0.3,  0.09, 'triangle', 0.1],
    [880, 0.42, 0.12, 'triangle', 0.12], [988, 0.55, 0.12, 'triangle', 0.12],
    [784, 0.68, 0.28, 'triangle', 0.13],
  ],
};

function playSound(name) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const notes = SOUND_RECIPES[name];
  if (!notes) return;
  const now = ctx.currentTime;
  notes.forEach(([freq, offset, duration, type, peak]) => playTone(ctx, freq, now + offset, duration, type, peak));
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  saveState();
  render();
}

// ---------- Effets visuels flottants ----------

function spawnFloatText(x, y, text, cls) {
  const layer = el('fxLayer');
  if (!layer) return;
  const span = document.createElement('span');
  span.className = `fx-float ${cls || ''}`;
  span.textContent = text;
  span.style.left = `${x}px`;
  span.style.top = `${y}px`;
  layer.appendChild(span);
  setTimeout(() => span.remove(), 1300);
}

function spawnBurst(x, y, emojis) {
  const layer = el('fxLayer');
  if (!layer) return;
  const set = emojis || ['✨', '🌟', '🎉'];
  const count = 7;
  for (let i = 0; i < count; i++) {
    const span = document.createElement('span');
    span.className = 'fx-burst';
    span.textContent = set[Math.floor(Math.random() * set.length)];
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const dist = 36 + Math.random() * 28;
    span.style.left = `${x}px`;
    span.style.top = `${y}px`;
    span.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    span.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    span.style.setProperty('--rot', `${Math.random() * 360 - 180}deg`);
    layer.appendChild(span);
    setTimeout(() => span.remove(), 1000);
  }
}

function render() {
  renderTopbar();
  renderChallenge();
  renderCustomers();
  renderStations();
  renderReady();
  renderControlBar();
}

function renderChallenge() {
  const bar = el('challengeBar');
  if (!bar) return;
  const challenge = state.dailyChallenge;
  const type = challenge && CHALLENGE_TYPES.find(t => t.id === challenge.typeId);
  if (!challenge || !type) { bar.innerHTML = ''; return; }

  const label = type.label(challenge.target);

  if (challenge.typeId === 'no_miss') {
    const missed = runtime.stats.missed;
    const ok = missed <= challenge.target;
    bar.innerHTML = `
      <span class="challenge-emoji">${type.emoji}</span>
      <span class="challenge-label">Défi du jour : ${label}</span>
      <span class="challenge-status ${ok ? 'ok' : 'fail'}">${missed} perdu${missed > 1 ? 's' : ''}</span>
      <span class="challenge-reward">🎁 +${challenge.reward}€</span>
    `;
    return;
  }

  const progress = Math.min(challengeProgressValue(challenge), challenge.target);
  const pct = challenge.target > 0 ? clamp((progress / challenge.target) * 100, 0, 100) : 100;
  bar.innerHTML = `
    <span class="challenge-emoji">${type.emoji}</span>
    <span class="challenge-label">Défi du jour : ${label}</span>
    <div class="challenge-progress-track"><div class="challenge-progress-fill" style="width:${pct}%"></div></div>
    <span class="challenge-progress-text">${progress}/${challenge.target}</span>
    <span class="challenge-reward">🎁 +${challenge.reward}€</span>
  `;
}

function renderTopbar() {
  el('statMoney').textContent = state.money.toFixed(2);
  el('statDay').textContent = state.day;
  el('statRep').textContent = `${state.reputation.toFixed(1)} ${starString(state.reputation)}`;
  el('statLevel').textContent = computeLevel(state.totalRevenue);
  el('restaurantName').textContent = state.restaurantName;

  const activeEvents = SEASONAL_EVENTS.filter(e => state.activeEvents.includes(e.id));
  el('eventBadge').textContent = activeEvents.map(e => e.emoji).join(' ');
  el('eventBadge').title = activeEvents.map(e => e.name).join(', ');
}

function patienceColor(ratio) {
  if (ratio > 0.5) return '#2ecc71';
  if (ratio > 0.2) return '#e6a417';
  return '#e74c3c';
}

function renderCustomers() {
  const list = runtime.customers.slice().sort((a, b) => a.patienceLeft - b.patienceLeft);
  const container = el('customerList');
  if (list.length === 0) {
    container.innerHTML = '<p class="empty-hint">Aucun client pour le moment.</p>';
    return;
  }
  container.innerHTML = list.map(c => {
    const ratio = clamp(c.patienceLeft / c.patienceMax, 0, 1);
    const orderLine = c.order.map(id => {
      const recipe = recipeById(id);
      const done = c.served.includes(id);
      return `<span class="${done ? 'order-done' : ''}">${recipe.emoji} ${recipe.name}${done ? ' ✓' : ''}</span>`;
    }).join(' + ');
    return `
      <div class="customer-card">
        <div class="customer-order">${c.order.length > 1 ? '📋 ' : ''}${orderLine}</div>
        <div class="patience-track"><div class="patience-fill" style="width:${(ratio * 100).toFixed(0)}%; background:${patienceColor(ratio)}"></div></div>
      </div>`;
  }).join('');
}

// Petit spectacle du pizzaiolo : pâte lancée en l'air, garniture, puis direction le four.
function renderPizzaShow(progress) {
  if (progress < 0.4) {
    return `<div class="pizza-show"><span class="pizza-emoji pizza-spin">🫓</span></div>`;
  }
  if (progress < 0.75) {
    const toppings = [
      [0.45, '🍅'],
      [0.58, '🧀'],
      [0.68, '🌿'],
    ].filter(([threshold]) => progress > threshold).map(([, emoji]) => `<span class="pizza-topping">${emoji}</span>`).join('');
    return `<div class="pizza-show">🫓${toppings}</div>`;
  }
  return `<div class="pizza-show"><span class="pizza-emoji pizza-oven">🔥</span><span class="pizza-emoji">🍕</span></div>`;
}

function renderStations() {
  const container = el('stationList');
  container.innerHTML = runtime.stations.map((st, i) => {
    if (!st.busy) {
      return `
        <div class="station-card idle">
          <div class="station-title">Poste ${i + 1} — libre</div>
          <button class="btn small" onclick="chooseRecipeForStation(${i})">➕ Choisir un plat</button>
        </div>`;
    }
    const recipe = recipeById(st.recipeId);
    const pct = clamp(st.progress * 100, 0, 100);
    const isPizza = recipe.special === 'pizza';
    return `
      <div class="station-card busy">
        <div class="station-title">Poste ${i + 1} — ${recipe.emoji} ${recipe.name}</div>
        ${isPizza ? renderPizzaShow(st.progress) : ''}
        <div class="progress-track">
          <div class="progress-zones"></div>
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
        <button class="btn small accent" onclick="handleDressClick(${i}, this)">${isPizza ? '🍕 Sortir du four !' : '🍽️ Dresser'}</button>
      </div>`;
  }).join('');
}

function renderReady() {
  const container = el('readyList');
  if (runtime.readyDishes.length === 0) {
    container.innerHTML = '<p class="empty-hint">Rien de prêt pour l\'instant.</p>';
    return;
  }
  container.innerHTML = runtime.readyDishes.map(dish => {
    const recipe = recipeById(dish.recipeId);
    const q = QUALITY[dish.quality];
    return `
      <div class="dish-card q-${dish.quality}" onclick="handleServeDish(${dish.id}, this)">
        <div class="dish-name">${recipe.emoji} ${recipe.name}</div>
        <div class="quality-tag">${q.emoji} ${q.label}</div>
      </div>`;
  }).join('');
}

function renderControlBar() {
  const btnStart = el('btnStartDay');
  const timerWrap = el('dayTimerWrap');
  if (runtime.active) {
    btnStart.disabled = true;
    btnStart.textContent = `⏳ Service en cours (${runtime.stats.served} servis, ${runtime.stats.missed} partis)`;
    timerWrap.classList.remove('hidden');
    const pct = runtime.dayDuration > 0 ? (runtime.dayTimeLeft / runtime.dayDuration) * 100 : 0;
    el('dayTimerBar').style.width = `${pct}%`;
  } else {
    btnStart.disabled = false;
    btnStart.textContent = '▶️ Ouvrir le service';
    timerWrap.classList.add('hidden');
  }
  el('btnSound').textContent = state.soundEnabled ? '🔊' : '🔇';
}

function handleDressClick(stationIndex, buttonEl) {
  const rect = buttonEl.getBoundingClientRect();
  const quality = onDressClick(stationIndex);
  if (quality === 'parfait') {
    playSound('parfait');
    spawnBurst(rect.left + rect.width / 2, rect.top, ['✨', '🌟']);
    spawnFloatText(rect.left + rect.width / 2, rect.top, 'Parfait !', 'fx-bonus');
  } else if (quality === 'rate') {
    playSound('rate');
  } else if (quality === 'bon') {
    playSound('good');
  }
}

function handleServeDish(dishId, cardEl) {
  const rect = cardEl ? cardEl.getBoundingClientRect() : el('statMoney').getBoundingClientRect();
  const levelBefore = computeLevel(state.totalRevenue);
  const result = serveDish(dishId);
  if (!result) return;

  spawnFloatText(rect.left + rect.width / 2, rect.top, `+${result.pay.toFixed(2)}€`, result.comboCompleted ? 'fx-bonus' : '');
  playSound(result.comboCompleted ? 'combo' : 'coin');

  if (result.comboCompleted) {
    spawnBurst(rect.left + rect.width / 2, rect.top);
  }
  if (result.newLevel > levelBefore) {
    toast(`🏅 Niveau ${result.newLevel} atteint !`);
  }
}

// ---------- Modales ----------

function openModal(html) {
  el('modalContent').innerHTML = html;
  el('modalOverlay').classList.remove('hidden');
  runtime.paused = true;
}

function closeModal() {
  el('modalOverlay').classList.add('hidden');
  el('modalContent').innerHTML = '';
  runtime.paused = false;
}

function chooseRecipeForStation(stationIndex) {
  const wanted = {};
  runtime.customers.forEach(c => {
    c.order.forEach(id => { if (!c.served.includes(id)) wanted[id] = (wanted[id] || 0) + 1; });
  });

  const wantedIds = Object.keys(wanted);
  const otherIds = state.unlockedRecipes.filter(id => !wantedIds.includes(id));

  const renderItem = (id, count) => {
    const r = recipeById(id);
    return `
      <button class="recipe-pick" onclick="startCookingStation(${stationIndex}, '${id}')">
        <span class="pick-emoji">${r.emoji}</span>
        <span class="pick-name">${r.name}</span>
        ${count ? `<span class="pick-count">×${count} demandé(s)</span>` : ''}
      </button>`;
  };

  const html = `
    <h2>👨‍🍳 Choisir un plat à cuisiner — Poste ${stationIndex + 1}</h2>
    ${wantedIds.length ? `<h3>Actuellement demandé</h3><div class="recipe-pick-list">${wantedIds.map(id => renderItem(id, wanted[id])).join('')}</div>` : ''}
    ${otherIds.length ? `<h3>Autres plats de la carte</h3><div class="recipe-pick-list">${otherIds.map(id => renderItem(id)).join('')}</div>` : ''}
    <button class="btn" onclick="closeModal()">Annuler</button>
  `;
  openModal(html);
}

function showDaySummary(levelBefore, finishedDay, challenge, challengeSuccess) {
  const levelAfter = computeLevel(state.totalRevenue);
  if (levelAfter > levelBefore) playSound('levelup');
  else if (challengeSuccess) playSound('challenge');

  let challengeHtml = '';
  if (challenge) {
    const type = CHALLENGE_TYPES.find(t => t.id === challenge.typeId);
    const label = type ? type.label(challenge.target) : '';
    challengeHtml = challengeSuccess
      ? `<p class="challenge-result success">✅ Défi réussi : ${label} — bonus +${challenge.reward}€</p>`
      : `<p class="challenge-result fail">❌ Défi manqué : ${label}</p>`;
  }

  const html = `
    <h2>📋 Bilan du jour ${finishedDay}</h2>
    <ul class="summary-list">
      <li>🍽️ Clients servis : ${runtime.stats.served}</li>
      <li>😡 Clients partis : ${runtime.stats.missed}</li>
      <li>💰 Recette du jour : ${runtime.stats.revenue.toFixed(2)}€</li>
      <li>⭐ Réputation actuelle : ${state.reputation.toFixed(1)} ${starString(state.reputation)}</li>
    </ul>
    ${challengeHtml}
    ${levelAfter > levelBefore ? `<p class="levelup">🏅 Niveau supérieur ! Vous êtes maintenant niveau ${levelAfter}.</p>` : ''}
    <div class="modal-actions">
      <button class="btn primary" onclick="openShop()">🛒 Aller à la boutique</button>
      <button class="btn" onclick="closeModal()">Fermer</button>
    </div>
  `;
  openModal(html);
}

// ---------- Onboarding : courte introduction pour un nouveau joueur ----------

const ONBOARDING_SLIDES = [
  {
    emoji: '👋',
    title: 'Bienvenue chez Antho !',
    body: `Vous reprenez un petit restaurant. Chaque service : des clients
      arrivent, vous cuisinez leurs plats, vous les servez à temps. Simple à
      apprendre, difficile à optimiser !`,
  },
  {
    emoji: '🔥',
    title: 'En cuisine',
    body: `Cliquez sur un poste libre puis choisissez un plat demandé. La
      barre de cuisson traverse trois zones : <span class="hl-red">rouge</span>
      = trop tôt, <span class="hl-green">verte</span> = dressage parfait,
      grise = correct mais moins soigné. Cliquez sur <strong>Dresser</strong>
      au bon moment !`,
  },
  {
    emoji: '🍽️',
    title: 'Le service',
    body: `Le plat prêt part automatiquement au client le plus impatient qui
      l'a commandé. Servir vite et bien rapporte plus d'argent et de
      réputation ⭐ — trop lent, le client s'en va fâché.`,
  },
  {
    emoji: '🛒',
    title: 'Faire grandir le restaurant',
    body: `Entre deux services, la <strong>Boutique</strong> permet de
      débloquer recettes, matériel et décoration avec l'argent gagné.
      Bon appétit, chef !`,
  },
];

let onboardingStep = 0;

function maybeShowOnboarding() {
  if (!state.onboardingDone) showOnboarding();
}

function showOnboarding() {
  onboardingStep = 0;
  renderOnboardingStep();
}

function renderOnboardingStep() {
  const slide = ONBOARDING_SLIDES[onboardingStep];
  const isLast = onboardingStep === ONBOARDING_SLIDES.length - 1;
  const dots = ONBOARDING_SLIDES.map((_, i) =>
    `<span class="step-dot ${i === onboardingStep ? 'active' : ''}"></span>`).join('');
  const html = `
    <div class="onboarding">
      <div class="onboarding-emoji">${slide.emoji}</div>
      <h2>${slide.title}</h2>
      <p>${slide.body}</p>
      <div class="onboarding-steps">${dots}</div>
      <div class="modal-actions">
        <button class="btn" onclick="finishOnboarding()">Passer l'intro</button>
        <button class="btn primary" onclick="onboardingNext()">${isLast ? "C'est parti ! 👨‍🍳" : 'Suivant →'}</button>
      </div>
    </div>
  `;
  openModal(html);
}

function onboardingNext() {
  if (onboardingStep < ONBOARDING_SLIDES.length - 1) {
    onboardingStep++;
    renderOnboardingStep();
  } else {
    finishOnboarding();
  }
}

function finishOnboarding() {
  state.onboardingDone = true;
  saveState();
  closeModal();
}

let shopTab = 'recettes';

function openShop() {
  shopTab = 'recettes';
  renderShop();
}

function setShopTab(tab) {
  shopTab = tab;
  renderShop();
}

function renderShop() {
  const level = computeLevel(state.totalRevenue);

  const tabs = `
    <div class="shop-tabs">
      <button class="tab ${shopTab === 'recettes' ? 'active' : ''}" onclick="setShopTab('recettes')">📖 Recettes</button>
      <button class="tab ${shopTab === 'equipement' ? 'active' : ''}" onclick="setShopTab('equipement')">🏗️ Équipement</button>
      <button class="tab ${shopTab === 'decoration' ? 'active' : ''}" onclick="setShopTab('decoration')">✨ Décoration</button>
      <button class="tab ${shopTab === 'evenement' ? 'active' : ''}" onclick="setShopTab('evenement')">🎄 Événement</button>
    </div>`;

  let body = '';

  if (shopTab === 'recettes') {
    body = Object.keys(CAT_LABELS).map(cat => {
      const items = RECIPES.filter(r => r.cat === cat).map(r => {
        const owned = state.unlockedRecipes.includes(r.id);
        const locked = level < r.unlockLevel;
        const eventInfo = r.event ? SEASONAL_EVENTS.find(e => e.id === r.event) : null;
        let action;
        if (owned) {
          action = '<span class="badge">Sur la carte</span>';
        } else if (eventInfo) {
          action = `<span class="badge locked">🎄 Via l'événement</span>`;
        } else {
          action = `<button class="btn small" ${locked ? 'disabled' : ''} onclick="buyRecipe('${r.id}')">${r.unlockCost}€</button>`;
        }
        return `
          <div class="shop-item ${owned ? 'owned' : ''}">
            <div class="shop-item-main">
              <span class="pick-emoji">${r.emoji}</span>
              <div>
                <div class="shop-item-name">${r.name}${eventInfo ? ` <span class="event-tag">${eventInfo.emoji}</span>` : ''}</div>
                <div class="shop-item-desc">Vente ${r.price}€ · Cuisson ${(r.cookTime / 1000).toFixed(0)}s ${!owned && !eventInfo && locked ? `· Niveau ${r.unlockLevel} requis` : ''}</div>
              </div>
            </div>
            ${action}
          </div>`;
      }).join('');
      return `<h3>${CAT_LABELS[cat]}</h3><div class="shop-list">${items}</div>`;
    }).join('');
  }

  if (shopTab === 'equipement') {
    const stationCost = STATION_UPGRADE_COST[state.stations];
    const seatCost = SEAT_UPGRADE_COST[state.seats];
    const speedItems = SPEED_ITEMS.map(item => {
      const owned = state.purchasedSpeed.includes(item.id);
      const locked = level < item.unlockLevel;
      return `
        <div class="shop-item ${owned ? 'owned' : ''}">
          <div class="shop-item-main">
            <span class="pick-emoji">${item.emoji}</span>
            <div>
              <div class="shop-item-name">${item.name}</div>
              <div class="shop-item-desc">${item.desc} ${locked ? `· Niveau ${item.unlockLevel} requis` : ''}</div>
            </div>
          </div>
          ${owned ? '<span class="badge">Acquis</span>' : `<button class="btn small" ${locked ? 'disabled' : ''} onclick="buySpeedItem('${item.id}')">${item.cost}€</button>`}
        </div>`;
    }).join('');

    body = `
      <h3>Postes de cuisson (actuellement ${state.stations}/${MAX_STATIONS})</h3>
      <div class="shop-list">
        <div class="shop-item">
          <div class="shop-item-main">
            <span class="pick-emoji">🔥</span>
            <div>
              <div class="shop-item-name">Nouveau poste de cuisson</div>
              <div class="shop-item-desc">Cuisinez plus de plats en parallèle</div>
            </div>
          </div>
          ${stationCost !== undefined
            ? `<button class="btn small" onclick="buyStation()">${stationCost}€</button>`
            : '<span class="badge">Maximum</span>'}
        </div>
      </div>
      <h3>Places assises (actuellement ${state.seats}/${MAX_SEATS})</h3>
      <div class="shop-list">
        <div class="shop-item">
          <div class="shop-item-main">
            <span class="pick-emoji">🪑</span>
            <div>
              <div class="shop-item-name">Table supplémentaire</div>
              <div class="shop-item-desc">Accueillez plus de clients en même temps</div>
            </div>
          </div>
          ${seatCost !== undefined
            ? `<button class="btn small" onclick="buySeat()">${seatCost}€</button>`
            : '<span class="badge">Maximum</span>'}
        </div>
      </div>
      <h3>Matériel de cuisine</h3>
      <div class="shop-list">${speedItems}</div>
    `;
  }

  if (shopTab === 'decoration') {
    body = `<div class="shop-list">${DECOR_ITEMS.map(item => {
      const owned = state.purchasedDecor.includes(item.id);
      const locked = level < item.unlockLevel;
      return `
        <div class="shop-item ${owned ? 'owned' : ''}">
          <div class="shop-item-main">
            <span class="pick-emoji">${item.emoji}</span>
            <div>
              <div class="shop-item-name">${item.name}</div>
              <div class="shop-item-desc">${item.desc} ${locked ? `· Niveau ${item.unlockLevel} requis` : ''}</div>
            </div>
          </div>
          ${owned ? '<span class="badge">Installé</span>' : `<button class="btn small" ${locked ? 'disabled' : ''} onclick="buyDecor('${item.id}')">${item.cost}€</button>`}
        </div>`;
    }).join('')}</div>`;
  }

  if (shopTab === 'evenement') {
    body = `<div class="shop-list">${SEASONAL_EVENTS.map(event => {
      const active = state.activeEvents.includes(event.id);
      const locked = level < event.unlockLevel;
      const tooEarly = state.day < event.minDay;
      const disabled = locked || tooEarly;
      let note = '';
      if (locked) note = `· Niveau ${event.unlockLevel} requis`;
      else if (tooEarly) note = `· Disponible à partir du jour ${event.minDay}`;
      return `
        <div class="shop-item ${active ? 'owned' : ''}">
          <div class="shop-item-main">
            <span class="pick-emoji">${event.emoji}</span>
            <div>
              <div class="shop-item-name">${event.name}</div>
              <div class="shop-item-desc">${event.desc} ${note}</div>
            </div>
          </div>
          ${active ? '<span class="badge">Actif</span>' : `<button class="btn small" ${disabled ? 'disabled' : ''} onclick="buySeasonalEvent('${event.id}')">${event.cost}€</button>`}
        </div>`;
    }).join('')}</div>`;
  }

  const html = `
    <h2>🛒 Boutique — ${state.money.toFixed(2)}€ disponibles</h2>
    ${tabs}
    <div class="shop-body">${body}</div>
    <div class="modal-actions">
      ${!runtime.active ? '<button class="btn primary" onclick="startDay()">▶️ Ouvrir le service</button>' : ''}
      <button class="btn" onclick="closeModal()">Fermer</button>
    </div>
  `;
  openModal(html);
}

// ---------- Notifications ----------

function toast(msg) {
  const container = el('toastContainer');
  const div = document.createElement('div');
  div.className = 'toast';
  div.textContent = msg;
  container.appendChild(div);
  setTimeout(() => { div.classList.add('fade-out'); }, 2400);
  setTimeout(() => { div.remove(); }, 3000);
}
