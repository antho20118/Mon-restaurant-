// Données de contenu du jeu : recettes, améliorations, paliers de niveau.
// Séparé de la logique (game.js) pour pouvoir enrichir la carte facilement.

const RECIPES = [
  { id: 'salade_cesar',     name: 'Salade César',          cat: 'entree',  emoji: '🥗', price: 8,  cookTime: 4000, unlockLevel: 1, unlockCost: 0 },
  { id: 'soupe_oignon',     name: "Soupe à l'oignon",      cat: 'entree',  emoji: '🍲', price: 9,  cookTime: 5000, unlockLevel: 2, unlockCost: 150 },
  { id: 'escargots',        name: 'Escargots de Bourgogne', cat: 'entree',  emoji: '🐌', price: 12, cookTime: 5000, unlockLevel: 4, unlockCost: 400 },

  { id: 'steak_frites',     name: 'Steak-frites',          cat: 'plat',    emoji: '🥩', price: 18, cookTime: 7000, unlockLevel: 1, unlockCost: 0 },
  { id: 'ratatouille',      name: 'Ratatouille',           cat: 'plat',    emoji: '🍆', price: 15, cookTime: 6000, unlockLevel: 2, unlockCost: 200 },
  { id: 'coq_au_vin',       name: 'Coq au vin',            cat: 'plat',    emoji: '🍗', price: 20, cookTime: 8000, unlockLevel: 3, unlockCost: 300 },
  { id: 'magret',           name: 'Magret de canard',      cat: 'plat',    emoji: '🦆', price: 24, cookTime: 8000, unlockLevel: 5, unlockCost: 600 },
  { id: 'bouillabaisse',    name: 'Bouillabaisse',         cat: 'plat',    emoji: '🐟', price: 26, cookTime: 9000, unlockLevel: 6, unlockCost: 800 },

  { id: 'creme_brulee',     name: 'Crème brûlée',          cat: 'dessert', emoji: '🍮', price: 10, cookTime: 5000, unlockLevel: 1, unlockCost: 0 },
  { id: 'mousse_chocolat',  name: 'Mousse au chocolat',    cat: 'dessert', emoji: '🍫', price: 9,  cookTime: 4000, unlockLevel: 2, unlockCost: 150 },
  { id: 'tarte_tatin',      name: 'Tarte Tatin',           cat: 'dessert', emoji: '🥧', price: 11, cookTime: 5500, unlockLevel: 3, unlockCost: 250 },
  { id: 'profiteroles',     name: 'Profiteroles',          cat: 'dessert', emoji: '🍨', price: 13, cookTime: 6000, unlockLevel: 5, unlockCost: 500 },
];

const CAT_LABELS = { entree: 'Entrées', plat: 'Plats', dessert: 'Desserts' };

// Coût pour passer de N stations à N+1 (clé = nombre de stations actuel)
const STATION_UPGRADE_COST = { 1: 300, 2: 800, 3: 2000, 4: 5000 };
const MAX_STATIONS = 5;

// Coût pour passer de N places à N+1 (clé = nombre de places actuel)
const SEAT_UPGRADE_COST = { 3: 200, 4: 500, 5: 1200, 6: 2500, 7: 5000 };
const MAX_SEATS = 8;

const DECOR_ITEMS = [
  { id: 'nappes',         name: 'Nappes en lin',      emoji: '🧺', cost: 150, unlockLevel: 1, tipBonus: 0.05, desc: '+5% sur les pourboires' },
  { id: 'musique',        name: 'Musique douce',      emoji: '🎻', cost: 250, unlockLevel: 2, tipBonus: 0.05, desc: '+5% sur les pourboires' },
  { id: 'eclairage',      name: 'Éclairage tamisé',   emoji: '🕯️', cost: 400, unlockLevel: 3, tipBonus: 0.10, desc: '+10% sur les pourboires' },
  { id: 'vaisselle_fine', name: 'Vaisselle fine',     emoji: '🍽️', cost: 600, unlockLevel: 4, tipBonus: 0.12, desc: '+12% sur les pourboires' },
  { id: 'terrasse',       name: 'Terrasse fleurie',   emoji: '🌸', cost: 900, unlockLevel: 5, tipBonus: 0.15, repBonus: 0.3, desc: '+15% pourboires, +0.3★ réputation' },
];

const SPEED_ITEMS = [
  { id: 'couteaux_pro',    name: 'Couteaux professionnels', emoji: '🔪', cost: 250,  unlockLevel: 2, speedBonus: 0.10, desc: '-10% temps de cuisson' },
  { id: 'four_convection', name: 'Four à convection',       emoji: '♨️', cost: 600,  unlockLevel: 4, speedBonus: 0.15, desc: '-15% temps de cuisson' },
  { id: 'brigade',         name: 'Brigade organisée',       emoji: '👨‍🍳', cost: 1200, unlockLevel: 6, speedBonus: 0.15, desc: '-15% temps de cuisson' },
];

// Chiffre d'affaires cumulé nécessaire pour atteindre le niveau N (index = niveau)
const LEVEL_THRESHOLDS = [0, 0, 250, 700, 1500, 3000, 5500, 9500, 16000, 26000, 42000];

const QUALITY = {
  rate:    { mult: 0.7, label: 'Raté',      emoji: '😖' },
  bon:     { mult: 1.0, label: 'Bien cuit', emoji: '🙂' },
  parfait: { mult: 1.3, label: 'Parfait',   emoji: '🤩' },
};
