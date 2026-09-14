// Données de contenu du jeu : recettes, améliorations, paliers de niveau.
// Séparé de la logique (game.js) pour pouvoir enrichir la carte facilement.

const RECIPES = [
  { id: 'salade_cesar',     name: 'Salade César',          cat: 'entree',  emoji: '🥗', price: 8,  cookTime: 4000, unlockLevel: 1, unlockCost: 0 },
  { id: 'soupe_oignon',     name: "Soupe à l'oignon",      cat: 'entree',  emoji: '🍲', price: 9,  cookTime: 5000, unlockLevel: 2, unlockCost: 150 },
  { id: 'escargots',        name: 'Escargots de Bourgogne', cat: 'entree',  emoji: '🐌', price: 12, cookTime: 5000, unlockLevel: 4, unlockCost: 400 },
  { id: 'huitres',          name: "Plateau d'huîtres",     cat: 'entree',  emoji: '🦪', price: 16, cookTime: 4500, unlockLevel: 6, unlockCost: 900 },

  { id: 'steak_frites',     name: 'Steak-frites',          cat: 'plat',    emoji: '🥩', price: 18, cookTime: 7000, unlockLevel: 1, unlockCost: 0 },
  { id: 'ratatouille',      name: 'Ratatouille',           cat: 'plat',    emoji: '🍆', price: 15, cookTime: 6000, unlockLevel: 2, unlockCost: 200 },
  { id: 'pizza_margherita', name: 'Pizza Margherita',      cat: 'plat',    emoji: '🍕', price: 14, cookTime: 6000, unlockLevel: 2, unlockCost: 180, special: 'pizza' },
  { id: 'coq_au_vin',       name: 'Coq au vin',            cat: 'plat',    emoji: '🍗', price: 20, cookTime: 8000, unlockLevel: 3, unlockCost: 300 },
  { id: 'boeuf_bourguignon', name: 'Bœuf bourguignon',     cat: 'plat',    emoji: '🥘', price: 22, cookTime: 8500, unlockLevel: 4, unlockCost: 450 },
  { id: 'magret',           name: 'Magret de canard',      cat: 'plat',    emoji: '🦆', price: 24, cookTime: 8000, unlockLevel: 5, unlockCost: 600 },
  { id: 'bouillabaisse',    name: 'Bouillabaisse',         cat: 'plat',    emoji: '🐟', price: 26, cookTime: 9000, unlockLevel: 6, unlockCost: 800 },
  { id: 'homard_thermidor', name: 'Homard thermidor',      cat: 'plat',    emoji: '🦞', price: 32, cookTime: 9500, unlockLevel: 8, unlockCost: 1800 },

  { id: 'creme_brulee',     name: 'Crème brûlée',          cat: 'dessert', emoji: '🍮', price: 10, cookTime: 5000, unlockLevel: 1, unlockCost: 0 },
  { id: 'mousse_chocolat',  name: 'Mousse au chocolat',    cat: 'dessert', emoji: '🍫', price: 9,  cookTime: 4000, unlockLevel: 2, unlockCost: 150 },
  { id: 'tarte_tatin',      name: 'Tarte Tatin',           cat: 'dessert', emoji: '🥧', price: 11, cookTime: 5500, unlockLevel: 3, unlockCost: 250 },
  { id: 'profiteroles',     name: 'Profiteroles',          cat: 'dessert', emoji: '🍨', price: 13, cookTime: 6000, unlockLevel: 5, unlockCost: 500 },
  { id: 'souffle_grand_marnier', name: 'Soufflé au Grand Marnier', cat: 'dessert', emoji: '🍰', price: 17, cookTime: 6500, unlockLevel: 7, unlockCost: 1100 },

  // Menu de Noël — débloqué en une fois via l'onglet Événement de la boutique, pas à l'unité.
  { id: 'veloute_chataignes', name: 'Velouté de châtaignes',     cat: 'entree',  emoji: '🌰', price: 11, cookTime: 4500, unlockLevel: 3, unlockCost: 0, event: 'noel' },
  { id: 'dinde_marrons',      name: 'Dinde rôtie aux marrons',   cat: 'plat',    emoji: '🦃', price: 28, cookTime: 9000, unlockLevel: 3, unlockCost: 0, event: 'noel' },
  { id: 'buche_noel',         name: 'Bûche de Noël',             cat: 'dessert', emoji: '🎂', price: 14, cookTime: 5500, unlockLevel: 3, unlockCost: 0, event: 'noel' },

  // Terrasse d'été — même principe, événement 'ete'.
  { id: 'gaspacho',           name: 'Gaspacho andalou',          cat: 'entree',  emoji: '🍅', price: 10, cookTime: 4000, unlockLevel: 3, unlockCost: 0, event: 'ete' },
  { id: 'salade_nicoise',     name: 'Salade niçoise',            cat: 'plat',    emoji: '🫒', price: 17, cookTime: 5000, unlockLevel: 3, unlockCost: 0, event: 'ete' },
  { id: 'tarte_citron',       name: 'Tarte au citron meringuée', cat: 'dessert', emoji: '🍋', price: 13, cookTime: 5500, unlockLevel: 3, unlockCost: 0, event: 'ete' },
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
  { id: 'cave_a_vins',    name: 'Cave à vins vitrée', emoji: '🍷', cost: 1400, unlockLevel: 7, tipBonus: 0.18, desc: '+18% sur les pourboires' },
];

// Événements saisonniers : débloquent d'un coup un petit menu à thème exclusif.
const SEASONAL_EVENTS = [
  {
    id: 'noel',
    name: 'Menu de Noël',
    emoji: '🎄',
    cost: 350,
    unlockLevel: 3,
    minDay: 5,
    tipBonus: 0.10,
    desc: 'Débloque 3 plats de fête (velouté de châtaignes, dinde aux marrons, bûche de Noël) et une ambiance festive : +10% sur les pourboires tant que l\'événement est actif.',
  },
  {
    id: 'ete',
    name: "Terrasse d'été",
    emoji: '☀️',
    cost: 300,
    unlockLevel: 3,
    minDay: 5,
    tipBonus: 0.10,
    desc: 'Débloque 3 plats d\'été (gaspacho andalou, salade niçoise, tarte au citron meringuée) et une ambiance de terrasse : +10% sur les pourboires tant que l\'événement est actif.',
  },
];

const SPEED_ITEMS = [
  { id: 'couteaux_pro',    name: 'Couteaux professionnels', emoji: '🔪', cost: 250,  unlockLevel: 2, speedBonus: 0.10, desc: '-10% temps de cuisson' },
  { id: 'four_convection', name: 'Four à convection',       emoji: '♨️', cost: 600,  unlockLevel: 4, speedBonus: 0.15, desc: '-15% temps de cuisson' },
  { id: 'brigade',         name: 'Brigade organisée',       emoji: '👨‍🍳', cost: 1200, unlockLevel: 6, speedBonus: 0.15, desc: '-15% temps de cuisson' },
];

// Chiffre d'affaires cumulé nécessaire pour atteindre le niveau N (index = niveau)
const LEVEL_THRESHOLDS = [0, 0, 250, 700, 1500, 3000, 5500, 9500, 16000, 26000, 42000, 65000, 95000];

// À partir de ce niveau, une partie des clients commandent un menu (entrée + plat)
const COMBO_MIN_LEVEL = 4;
const COMBO_CHANCE = 0.35;
const COMBO_PATIENCE_FACTOR = 1.6; // les clients qui attendent deux plats sont un peu plus patients
const COMBO_BONUS_RATE = 0.15; // bonus sur le prix des deux plats quand le menu complet est servi

// Simulation d'achats en argent réel — AUCUN paiement n'est traité, purement illustratif
// (pas de carte bancaire, pas de réseau) pour visualiser un modèle de monétisation.
const PREMIUM_TOPUPS = [
  { id: 'topup_s', label: '4,99 $', amount: 4.99 },
  { id: 'topup_m', label: '9,99 $', amount: 9.99 },
  { id: 'topup_l', label: '19,99 $', amount: 19.99 },
];

const COIN_PACKS = [
  { id: 'coins_s', name: 'Petite caisse',  emoji: '💰', priceUSD: 4.99,  coins: 500 },
  { id: 'coins_m', name: 'Caisse moyenne', emoji: '💵', priceUSD: 9.99,  coins: 1200 },
  { id: 'coins_l', name: 'Grosse caisse',  emoji: '💎', priceUSD: 19.99, coins: 3000 },
  { id: 'coins_xl', name: 'Caisse du patron', emoji: '👑', priceUSD: 49.99, coins: 9000, badge: 'Meilleure offre' },
];

const GAMEPASSES = [
  { id: 'pass_chef', name: 'Pass Chef étoilé', emoji: '⭐', priceUSD: 6.99, tipBonus: 0.10, desc: 'Bonus permanent : +10% sur tous les pourboires, pour toujours.' },
  { id: 'pass_maitre_hotel', name: "Pass Maître d'hôtel", emoji: '🎩', priceUSD: 9.99, tipBonus: 0.08, desc: 'Bonus permanent : +8% sur tous les pourboires, pour toujours.' },
];

// Bonus de connexion : une récompense par jour calendaire réel (pas par jour de service),
// croissante avec la série de jours consécutifs, qui reboucle après une semaine.
const LOGIN_BONUS_REWARDS = [20, 30, 40, 60, 80, 100, 150];

// Défi du jour : un objectif tiré au sort chaque jour, avec une récompense en argent.
const CHALLENGE_TYPES = [
  { id: 'serve_count',   emoji: '🍽️', baseTarget: 5,  perLevel: 1,   label: t => `Servir au moins ${t} plats` },
  { id: 'serve_perfect', emoji: '🤩', baseTarget: 2,  perLevel: 0.5, label: t => `Réussir ${t} dressage${t > 1 ? 's' : ''} "Parfait"` },
  { id: 'no_miss',       emoji: '😌', baseTarget: 0,  perLevel: 0,   label: () => `Ne laisser partir aucun client fâché` },
  { id: 'earn_money',    emoji: '💰', baseTarget: 60, perLevel: 15,  label: t => `Encaisser au moins ${t}€ de recette` },
  { id: 'combo_count',   emoji: '📋', baseTarget: 1,  perLevel: 0,   label: t => `Servir ${t} menu${t > 1 ? 's' : ''} complet${t > 1 ? 's' : ''}`, minLevel: COMBO_MIN_LEVEL },
];
const CHALLENGE_REWARD_BASE = 40;
const CHALLENGE_REWARD_PER_LEVEL = 8;

const QUALITY = {
  rate:    { mult: 0.7, label: 'Raté',      emoji: '😖' },
  bon:     { mult: 1.0, label: 'Bien cuit', emoji: '🙂' },
  parfait: { mult: 1.3, label: 'Parfait',   emoji: '🤩' },
};
