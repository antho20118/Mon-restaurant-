# Chez Antho — Simulateur de restaurant 🍽️

Prototype jouable d'un **tycoon / simulateur de gestion de restaurant**, pensé
comme socle pour valider la boucle de jeu et le contenu culinaire avant un
éventuel portage sur une plateforme comme Roblox.

## Comment jouer

Aucune installation nécessaire : ouvrez `index.html` dans un navigateur
(ou servez le dossier avec un petit serveur statique, ex. `npx http-server`).
La partie se sauvegarde automatiquement dans le navigateur (`localStorage`).

**Boucle de jeu :**
1. Cliquez sur **▶️ Ouvrir le service** : des clients arrivent et commandent
   un plat au hasard parmi votre carte débloquée. Chaque client a une jauge
   de patience.
2. Sur un poste de cuisine libre, cliquez **➕ Choisir un plat** puis
   sélectionnez une recette (en priorité celles demandées par les clients).
3. Pendant la cuisson, une barre de progression traverse trois zones
   (rouge = trop tôt, verte = dressage parfait, grise = plat cuit mais moins
   soigné). Cliquez **🍽️ Dresser** au bon moment pour maximiser la qualité —
   un vrai petit geste de cuisine plutôt qu'une simple barre de chargement.
4. Le plat prêt apparaît dans **Prêt à servir** : cliquez dessus pour le
   servir automatiquement au client le plus pressé qui l'a commandé. Vous
   gagnez de l'argent (+ pourboire selon rapidité et qualité) et de la
   réputation.
5. À la fin du service, un bilan s'affiche puis la **🛒 Boutique** permet de
   dépenser vos gains : débloquer de nouvelles recettes (entrées, plats,
   desserts inspirés d'une vraie carte française), installer des postes de
   cuisson ou des tables supplémentaires, améliorer le matériel (temps de
   cuisson) ou la décoration (pourboires, réputation).
6. Le niveau du restaurant progresse avec le chiffre d'affaires cumulé et
   débloque progressivement du contenu plus avancé (et plus rentable).

## Architecture du code

Projet en JavaScript vanilla, sans dépendance ni étape de build, pour rester
facile à faire évoluer et à héberger n'importe où :

```
index.html      Structure de la page
css/style.css   Thème visuel (ambiance bois/restaurant)
js/data.js      Contenu du jeu : recettes, améliorations, paliers de niveau
js/game.js      État et logique de simulation (boucle de service, cuisson,
                service, boutique, sauvegarde)
js/ui.js        Rendu DOM et interactions (séparé de la logique de jeu)
```

- **État persistant** (`state` dans `game.js`) : argent, jour, réputation,
  chiffre d'affaires cumulé, recettes/équipement/décoration débloqués.
  Sauvegardé dans `localStorage` après chaque action qui le modifie.
- **État de service** (`runtime`) : clients en attente, postes de cuisson,
  plats prêts — recalculé à chaque service, non persistant (un rechargement
  en plein service relance simplement un service propre sans perdre l'argent
  ni les déblocages).
- Boucle de jeu pilotée par un `setInterval` de 100 ms (`tick()`), qui gère
  la patience des clients, la progression de cuisson, l'apparition de
  nouveaux clients et la fin de journée.

## Différenciateur produit

L'idée pitchée est de miser sur une **authenticité culinaire réelle** plutôt
que sur un habillage générique :
- Recettes crédibles issues d'une vraie carte (entrées/plats/desserts
  français), avec prix et temps de cuisson cohérents entre eux.
- Le mini-jeu de dressage (viser la zone verte) représente un vrai geste de
  cuisinier — timing de cuisson — plutôt qu'une simple attente passive.
- La progression (carte, matériel, décoration) suit la logique d'un vrai
  restaurant qui monte en gamme plutôt qu'un arbre de compétences abstrait.

## Pistes d'évolution (roadmap)

- **Menus/combos** : certains clients à haut niveau commandent un menu
  entrée + plat, avec bonus si les deux sont servis ensemble.
- **Étapes de préparation détaillées par recette** (découpe, cuisson,
  assaisonnement, dressage) plutôt qu'un seul mini-jeu générique de timing.
- **Événements saisonniers** (menu de Noël, terrasse d'été) avec recettes et
  décors limités dans le temps — cohérent avec l'idée de monétisation par
  événements.
- **Portage Roblox** : ce prototype web sert de banc d'essai pour
  l'équilibrage (prix, temps de cuisson, coûts de déblocage, courbes de
  progression) avant réécriture en Luau. Les données de `js/data.js` sont
  conçues pour être portées telles quelles vers des `ModuleScript` Roblox.
  Les gamepasses/accélérateurs/recettes exclusives mentionnés dans le pitch
  correspondraient aux achats de la boutique actuelle (recettes, équipement,
  décoration), à connecter à `MarketplaceService` côté Roblox.
- **Multijoueur / plusieurs restaurants** : hors scope de ce prototype
  solo, mais l'état (`state`) est déjà isolé proprement pour être répliqué
  par joueur.

## Limites connues du prototype

- Pas d'assets graphiques (tout est en emoji) : volontaire pour se concentrer
  sur la boucle de jeu et l'équilibrage avant d'investir dans l'art.
- Pas de son.
- Une seule sauvegarde locale par navigateur (pas de compte / cloud save).
- Économie et paliers de niveau posés à dire d'expert pour un prototype
  jouable ; à réajuster avec de vraies données de test joueurs.
