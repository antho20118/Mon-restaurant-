// Rendu DOM et interactions — sépare l'affichage de la logique de jeu (game.js).

function el(id) { return document.getElementById(id); }

function render() {
  renderTopbar();
  renderCustomers();
  renderStations();
  renderReady();
  renderControlBar();
}

function renderTopbar() {
  el('statMoney').textContent = state.money.toFixed(2);
  el('statDay').textContent = state.day;
  el('statRep').textContent = `${state.reputation.toFixed(1)} ${starString(state.reputation)}`;
  el('statLevel').textContent = computeLevel(state.totalRevenue);
  el('restaurantName').textContent = state.restaurantName;
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
    return `
      <div class="station-card busy">
        <div class="station-title">Poste ${i + 1} — ${recipe.emoji} ${recipe.name}</div>
        <div class="progress-track">
          <div class="progress-zones"></div>
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
        <button class="btn small accent" onclick="onDressClick(${i})">🍽️ Dresser</button>
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
      <div class="dish-card q-${dish.quality}" onclick="handleServeDish(${dish.id})">
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
}

function handleServeDish(dishId) {
  const levelBefore = computeLevel(state.totalRevenue);
  const newLevel = serveDish(dishId);
  if (newLevel !== undefined && newLevel > levelBefore) {
    toast(`🏅 Niveau ${newLevel} atteint !`);
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

function showDaySummary(levelBefore, finishedDay) {
  const levelAfter = computeLevel(state.totalRevenue);
  const html = `
    <h2>📋 Bilan du jour ${finishedDay}</h2>
    <ul class="summary-list">
      <li>🍽️ Clients servis : ${runtime.stats.served}</li>
      <li>😡 Clients partis : ${runtime.stats.missed}</li>
      <li>💰 Recette du jour : ${runtime.stats.revenue.toFixed(2)}€</li>
      <li>⭐ Réputation actuelle : ${state.reputation.toFixed(1)} ${starString(state.reputation)}</li>
    </ul>
    ${levelAfter > levelBefore ? `<p class="levelup">🏅 Niveau supérieur ! Vous êtes maintenant niveau ${levelAfter}.</p>` : ''}
    <div class="modal-actions">
      <button class="btn primary" onclick="openShop()">🛒 Aller à la boutique</button>
      <button class="btn" onclick="closeModal()">Fermer</button>
    </div>
  `;
  openModal(html);
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
    </div>`;

  let body = '';

  if (shopTab === 'recettes') {
    body = Object.keys(CAT_LABELS).map(cat => {
      const items = RECIPES.filter(r => r.cat === cat).map(r => {
        const owned = state.unlockedRecipes.includes(r.id);
        const locked = level < r.unlockLevel;
        return `
          <div class="shop-item ${owned ? 'owned' : ''}">
            <div class="shop-item-main">
              <span class="pick-emoji">${r.emoji}</span>
              <div>
                <div class="shop-item-name">${r.name}</div>
                <div class="shop-item-desc">Vente ${r.price}€ · Cuisson ${(r.cookTime / 1000).toFixed(0)}s ${locked ? `· Niveau ${r.unlockLevel} requis` : ''}</div>
              </div>
            </div>
            ${owned
              ? '<span class="badge">Sur la carte</span>'
              : `<button class="btn small" ${locked ? 'disabled' : ''} onclick="buyRecipe('${r.id}')">${r.unlockCost}€</button>`}
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
