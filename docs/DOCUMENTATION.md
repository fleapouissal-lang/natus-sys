# Documentation Natus — Plateforme de gestion

Documentation complète à remettre au client et aux équipes. Tous les rôles, les
fonctionnalités et leur fonctionnement sont regroupés dans ce **document unique**.

**Accès application (équipes) :** https://os.natusmarrakech.com/login

> **À retenir :** la plateforme s'articule autour de **deux flux** seulement :
> **1) les commandes** (ventes en magasin + **commandes en ligne** à préparer et
> livrer) et **2) les transferts de stock** entre les **magasins** et les
> **dépôts**. Il n'y a **pas** de gestion de boutique externe : tout se passe
> dans Natus. Le reste (fidélité, clients Pro, factures, chèques, clôtures,
> réclamations, planning…) vient se greffer autour de ces deux flux.

---

## Sommaire

1. [Présentation de la plateforme](#1-présentation-de-la-plateforme)
2. [Concepts clés](#2-concepts-clés)
3. [Les deux flux : Commandes & Stock](#3-les-deux-flux--commandes--stock)
4. [Connexion & navigation](#4-connexion--navigation)
5. [Rôle — Directeur](#5-rôle--directeur)
6. [Rôle — Gérant](#6-rôle--gérant)
7. [Rôle — Dépôt (Hub)](#7-rôle--dépôt-hub)
8. [Rôle — Caissier](#8-rôle--caissier)
9. [Rôle — Livreur](#9-rôle--livreur)
10. [Fonctionnalités en détail](#10-fonctionnalités-en-détail)
11. [Clients & pages publiques](#11-clients--pages-publiques)
12. [Adresses & accès](#12-adresses--accès)
13. [Questions fréquentes](#13-questions-fréquentes)

---

## 1. Présentation de la plateforme

Natus est une plateforme unique de gestion de commerce qui réunit, au même
endroit :

- **La caisse (point de vente)** dans chaque magasin ;
- **Les commandes** : ventes encaissées en magasin et **commandes en ligne** à
  préparer, puis à livrer ;
- **Les transferts de stock** entre les magasins et les dépôts ;
- **La gestion des clients** : programme de **fidélité** et **clients Pro** ;
- **Le suivi financier** : factures, chèques, clôtures de caisse ;
- **Le pilotage** par le directeur : tableau de bord, statistiques, organisation,
  configuration.

La plateforme est accessible sur **ordinateur, tablette et téléphone**. Les
espaces clients (fidélité, Pro, réclamations) sont des **applications web
installables (PWA)** : le client peut les « ajouter à l'écran d'accueil » comme
une vraie application, sans passer par un magasin d'applications.

### Ce que la plateforme N'EST PAS

- Ce n'est **pas** une boutique externe : il n'existe que **les commandes** et
  **les transferts de stock**.
- Les commandes affichées sont des **commandes en ligne** internes à Natus, que
  l'équipe prépare puis fait livrer.

---

## 2. Concepts clés

### Les structures

- **Magasin** : un point de vente équipé d'une **caisse**. Il appartient à une
  **ville**. C'est là que se font les ventes et les livraisons locales.
- **Dépôt (Hub)** : un **entrepôt logistique** qui **approvisionne les magasins**
  de sa ville. Chaque ville possède **un dépôt** rattaché à plusieurs magasins.

Exemple de configuration :

| Ville | Dépôt | Magasins rattachés |
|-------|-------|--------------------|
| **Marrakech** | Dépôt *Sidi Ghanem* | Ourika · Guéliz · Médina |
| **Casablanca** | Dépôt *Oulfa* | Oulfa · Maarif · Sidi Maârouf |

### Les rôles

| Rôle | Périmètre | Mission principale |
|------|-----------|--------------------|
| **Directeur** | Toute l'activité (toutes villes) | Pilotage, organisation, configuration |
| **Gérant** | Un magasin **ou** toute sa ville | Stock, planning, comptabilité, suivi |
| **Dépôt (Hub)** | Un dépôt + ses magasins | Stock central, approvisionnement |
| **Caissier** | Un magasin (compte **partagé**) | Caisse, ventes, réassorts |
| **Livreur** | Ses livraisons (**multi-villes**) | Livrer les commandes en ligne et les transferts |

Chaque utilisateur ne voit **que ce qui concerne son rôle et son périmètre**.
Les menus s'adaptent automatiquement.

### Le compte caisse partagé

- Un magasin dispose d'**un seul identifiant de connexion** pour la caisse,
  utilisé par tous les caissiers du magasin.
- Les **noms des caissiers** (qui travaille, quand) se gèrent dans le
  **Planning** — il n'est **pas** nécessaire de créer un compte par caissier.

### Périmètre & droits

- Le **directeur** voit tout.
- Le **gérant** est rattaché à un magasin ou à une ville (gérant de ville).
- Le **dépôt** voit son stock central **et** les stocks des magasins qui lui sont
  rattachés.
- Le **caissier** travaille sur le magasin connecté ; il peut **consulter** (en
  lecture seule) le stock des autres magasins et des dépôts.
- Le **livreur** n'est **pas** limité à une ville : il peut livrer dans une seule
  ville ou entre plusieurs villes.

---

## 3. Les deux flux : Commandes & Stock

### A) Le flux des COMMANDES

#### a) Vente en magasin (caisse)

Le caissier :

1. **Scanne** (code-barres) ou **recherche** les produits ;
2. Ajuste les **quantités** dans le panier ;
3. Rattache éventuellement la vente à un **client fidélité** ou un **client Pro** ;
4. Choisit le **mode de paiement** : **espèces**, **carte** ou **chèque** ;
5. **Valide** et **imprime le ticket** ;
6. Le **stock du magasin** est mis à jour automatiquement (déduit).

#### b) Commande en ligne

Une **commande en ligne** arrive dans la plateforme et suit ce parcours :

```
Reçue → Préparée en caisse → Prête → Remise au livreur
→ En cours de livraison → Livrée (ou Retour) → Encaissée
```

- Le **magasin** prépare la commande (les produits sont chargés dans la caisse).
- Un **livreur** est **assigné** : la commande apparaît dans son menu
  **« Livraisons »**.
- Une fois **livrée**, elle bascule dans **« Historique des livraisons »**.
- En cas de problème, le livreur marque **Retour** avec une **note obligatoire**
  (motif).
- Le **paiement** peut être à la livraison (encaissement) ou déjà réglé en ligne.

> Le client peut **suivre sa commande** via un lien de suivi
> (`/commande/...`) qui affiche l'avancement (préparée, en livraison, livrée).

### B) Le flux du STOCK (transferts magasin ⇄ dépôt)

```
Dépôt    ──(envoi)──▶  Magasin
Magasin  ──(envoi)──▶  Dépôt  ou  autre magasin
```

Tout transfert a un **statut** qui décrit où il en est :

| Statut | Signification |
|--------|---------------|
| **En cours** | Commande de transfert créée, stock réservé/déduit à la source |
| **Prête** | Préparée — en attente d'un livreur |
| **En livraison** | Remise au livreur, en route vers la destination |
| **Livré** | Le livreur a déposé le colis ; stock crédité à destination |
| **Reçu** | Réception **validée** par la destination — transfert terminé |

Règles :

- Le côté qui **envoie** suit l'opération dans **« Stocks envoyés »**.
- Le côté qui **reçoit** la valide dans **« Stocks reçus »** → le stock est ajouté.
- Un transfert peut être **assigné à un livreur**, qui le voit alors dans ses
  **« Livraisons »** (action « Prendre en charge » puis « Marquer livré »).
- Tant qu'un transfert n'est pas **reçu/validé**, il reste « en attente ».

#### Le bouton « Commander » (réassort caissier)

Quand un produit est **en rupture** (stock à 0) dans le magasin :

1. Un **badge** s'affiche sur le bouton **« Commander »** de la caisse, indiquant
   le **nombre de produits en rupture** ;
2. Le caissier ouvre **« Commander »** : les produits **en rupture** sont
   affichés **par défaut** ;
3. Il choisit la **source** : par défaut le **dépôt rattaché** au magasin, sinon
   un autre dépôt ou magasin **actif** ;
4. Il saisit (ou **scanne**) les **quantités** souhaitées, produit par produit ;
5. Il **valide** : la demande devient **stock envoyé** côté source et **stock
   reçu** côté magasin ;
6. Le produit **n'apparaît plus** comme en rupture, et la notification associée
   disparaît.

### Vocabulaire utile

- **Rupture** : produit dont le stock est à **0** dans le magasin.
- **Transfert** : envoi de stock d'une structure vers une autre.
- **Réassort** : demande de réapprovisionnement (bouton « Commander »).
- **Clôture** : arrêt de caisse de fin de journée.
- **PWA** : application web installable sur téléphone/tablette.
- **Annulation de stock** : retrait de stock pour casse, perte, péremption, etc.

---

## 4. Connexion & navigation

### Se connecter

1. Aller sur **https://os.natusmarrakech.com/login**.
2. Saisir **e-mail** + **mot de passe**.
3. Selon le **rôle**, l'utilisateur arrive sur son espace (Accueil, Caisse ou
   Livraisons) et ne voit que les menus qui le concernent.

### La barre latérale (sidebar)

- Sur **ordinateur**, les menus sont **regroupés par catégories** (ex. *Stock*,
  *Clients*, *Comptabilité*…). Chaque catégorie est un **groupe repliable** :
  on l'ouvre ou on le réduit avec une **flèche**. L'état (ouvert/fermé) est
  **mémorisé**.
- Sur **téléphone/tablette**, une **barre du bas** affiche les fonctions les plus
  utilisées, plus un menu **« Plus »** pour le reste.

### Déconnexion

Le bouton **« Déconnexion »** est en bas de la barre latérale.

---

## 5. Rôle — Directeur

Le **Directeur** a la **vision globale** : tous les magasins, tous les dépôts,
toutes les villes. Il pilote, organise et configure la plateforme.

### Menu (regroupé en catégories)

- **Tableau de bord** → *Accueil*
- **Ventes** → *Caisse* · *Clôtures caisse* · *Chèques* · *Factures* · *Réclamations*
- **Stock** → *Stock* · *Stocks envoyés* · *Stocks reçus* · *Annulations de stock* · *Accès stock*
- **Catalogue** → *Produits* · *Catégories des produits* · *Fabrication*
- **Clients** → *Clients fidélité* · *Clients Pro*
- **Organisation** → *Planning* · *Magasins & Dépôts*
- **Administration** → *Users* · *Historique* · *Actus* · *Paramètres*

### Le tableau de bord (Accueil)

- **Filtre de période** : *Toutes les périodes*, *Aujourd'hui*, *Cette semaine*,
  *Ce mois*, ou **période personnalisée** (date de début → date de fin). Tout se
  recalcule selon la période choisie.
- **Indicateurs synthétiques** : chiffre d'affaires, ventes, performance, etc.
- **Suivi des magasins** et **statistiques de stock** réunis sur **une seule
  page** (sans onglets), les sections les unes sous les autres, pour une vue
  globale immédiate.
- **Catégories des produits** : répartition des ventes par catégorie.

### Tâches courantes — pas à pas

**Créer un utilisateur**
1. *Users → Ajouter*.
2. Choisir le **rôle** (directeur, gérant, dépôt, caissier, livreur).
3. Sélectionner le **Pays** puis la **Ville** (listes **avec recherche** ;
   **Maroc** par défaut ; les villes où se trouvent des magasins sont proposées
   **en priorité**).
4. Rattacher au **magasin** si nécessaire (la liste des magasins est filtrée
   selon la ville choisie).
5. Renseigner e-mail / mot de passe → **Enregistrer**.

**Organiser magasins & dépôts**
- *Organisation → Magasins & Dépôts* : page unique avec **2 onglets**
  (*Magasins* et *Dépôts (Hubs)*). On y crée/modifie les structures et on
  **rattache les magasins à un dépôt**.

**Configurer la clôture de caisse**
- *Paramètres* : activer/désactiver la **validation par code gérant**. Selon ce
  réglage, la page **« Clôtures caisse »** du gérant apparaît ou non. *(La
  modification est bien enregistrée et prise en compte immédiatement.)*

**Gérer les accès stock**
- *Stock → Accès stock* : définir qui peut agir sur le stock et avec quel niveau.

**Analyser l'activité**
- *Accueil* : choisir une **période** → lecture immédiate des performances.

**Consulter l'historique**
- *Administration → Historique* : page à **3 onglets**
  1. **Journal du directeur** (affiché par défaut — actions/activité du directeur),
  2. **Historique des ventes**,
  3. **Historique des clôtures**.

### Bonnes pratiques
- Traiter les **Stocks reçus** en attente et les **Réclamations**.
- Maintenir **catalogue** et **catégories** à jour.
- Vérifier régulièrement les **alertes de rupture** et les **clôtures**.

---

## 6. Rôle — Gérant

Le **Gérant** est responsable d'un **magasin** (ou de toute sa **ville** s'il est
gérant de ville). Il pilote le stock, le planning, la comptabilité et le suivi.

### Menu (regroupé en catégories)

- **Tableau de bord** → *Accueil*
- **Stock** → *Stock* · *Stocks envoyés* · *Stocks reçus* · *Annulations de stock*
- **Gestion** → *Planning*
- **Comptabilité** → *Clôtures caisse* *(si le directeur exige le code gérant)* ·
  *Factures* · *Chèques*
- **Suivi** → *Réclamations* · *Historique* · *Actus*
- **Configuration** → *Paramètres*

### Tâches courantes — pas à pas

**Recevoir un transfert (réassort entrant)**
1. *Stock → Stocks reçus*.
2. Ouvrir le transfert, vérifier produits et quantités.
3. **Valider la réception** → le stock du magasin est **augmenté**.

**Envoyer du stock**
1. *Stock → Stocks envoyés → Nouveau transfert*.
2. Choisir la **destination** (dépôt ou autre magasin).
3. Sélectionner les **produits** et les **quantités**.
4. **Valider** → le transfert part (statut *Prête*/*En livraison*) ; la
   destination devra **valider** sa réception.

**Gérer le planning**
- *Gestion → Planning* : saisir les **noms** des caissiers et leurs **créneaux**.

**Suivre les réclamations**
- *Suivi → Réclamations* : le bouton **« Voir »** affiche le **détail** et la
  **photo jointe** (si le client en a ajouté une).

**Comptabilité**
- *Clôtures caisse* : suivre/valider les clôtures (selon configuration directeur).
- *Factures* et *Chèques* : consulter et gérer.

### Bonnes pratiques
- Traiter les **Stocks reçus** rapidement.
- Vérifier la **clôture de caisse** chaque soir.

---

## 7. Rôle — Dépôt (Hub)

Le **Dépôt** est l'**entrepôt** d'une ville. Il **approvisionne** les magasins
qui lui sont rattachés et gère le **stock central** ainsi que les **fabrications**.

### Menu (regroupé en catégories)

- **Tableau de bord** → *Accueil*
- **Stock** → *Stock des produits* · *Stock des fabrications* · *Stocks envoyés* ·
  *Stocks reçus* · *Annulations de stock*
- **Suivi** → *Historique* · *Actus*
- **Configuration** → *Paramètres*

### Le tableau de bord (Accueil)

- Affiche le **rapport du dépôt** ou, au choix, **d'un des magasins associés**.
- Met en avant **« Magasins assignés — alertes stock »** : la liste des magasins
  rattachés avec leurs **alertes de rupture**, pour anticiper les réassorts.
- Statistiques **exclusivement liées au dépôt** et à ses magasins.

### La page Stock

- Affiche **uniquement** : le **stock du dépôt** et le **stock des magasins
  rattachés** au dépôt. Aucun magasin non lié n'apparaît (visibilité limitée au
  périmètre).
- **Stock des produits** : produits finis.
- **Stock des fabrications** : éléments fabriqués / produits de fabrication.

### Tâches courantes — pas à pas

**Approvisionner un magasin**
1. *Stock → Stocks envoyés → Nouveau transfert*.
2. Choisir un **magasin rattaché**.
3. Sélectionner **produits** et **quantités** → **valider**.
4. Le magasin **valide la réception** → son stock est crédité.

**Répondre à un réassort** (suite au bouton « Commander » d'un caissier)
- Préparer la commande et **valider l'envoi** depuis *Stocks envoyés*.

**Surveiller les ruptures**
- Consulter la section *Magasins assignés — alertes stock* de l'**Accueil**.

### Bonnes pratiques
- Garder un **stock tampon** suffisant.
- Traiter les **Stocks reçus** (retours des magasins).

---

## 8. Rôle — Caissier

Le **Caissier** utilise la **caisse** du magasin via le **compte partagé** du
magasin. C'est le cœur opérationnel des ventes.

### Menu (regroupé en catégories)

- **Caisse** → *Caisse* (l'écran de vente)
- **Stock** → *Stock* *(lecture seule)* · *Commander* · *Stocks reçus* ·
  *Stocks envoyés* · *Annulations de stock*
- **Clients** → *Clients fidélité* · *Clients Pro*
- **Comptabilité** → *Factures* · *Chèques*
- **Suivi** → *Horaires* · *Notes* · *Actualités* · *Historique*
- **Configuration** → *Paramètres*

### L'écran Caisse — pas à pas

1. **Scanner** ou **rechercher** les produits → ils s'ajoutent au **panier**.
2. Ajuster les **quantités**.
3. *(Option)* Rattacher un **client fidélité** (scan de carte / recherche) ou un
   **client Pro**.
4. Choisir le **paiement** : **espèces**, **carte** ou **chèque**.
5. **Valider** → **impression du ticket**.

**Préparer une commande en ligne** : la caisse peut **charger une commande en
ligne** (ses produits remplissent le panier) pour l'encaisser/la finaliser.

**Le ticket de vente** :
- **Centré** sur la page à l'impression ;
- **Hauteur adaptée automatiquement** au nombre de produits (aucun article
  coupé) ;
- Éléments alignés : logo, informations magasin, produits, totaux, TVA, mode de
  paiement ;
- Format optimisé pour **imprimantes thermiques 58 mm / 80 mm** ;
- **L'aperçu correspond exactement à l'impression**.
- **Réimpression** possible depuis l'**Historique des ventes** et depuis la
  fenêtre des tickets.

### La page Stock (lecture seule)

- Consulter le stock de **tous les magasins** et de **tous les dépôts actifs**.
- Par défaut : le **stock du magasin** connecté.
- On peut sélectionner un autre magasin/dépôt → consultation **en lecture seule**
  (aucune modification possible).

### Commander un produit en rupture — pas à pas

1. Un **badge** apparaît sur **« Commander »** (nombre de produits en rupture).
2. Ouvrir **« Commander »** → les produits **en rupture** sont affichés par défaut.
3. Choisir la **source** (dépôt rattaché par défaut, sinon autre dépôt/magasin).
4. Saisir/**scanner** les **quantités** → **valider**.
5. La demande devient **stock envoyé** (source) / **stock reçu** (magasin) ; le
   produit **disparaît** des ruptures.

### Recevoir / envoyer du stock

- *Stocks reçus* : **valider** les transferts entrants → stock crédité.
- *Stocks envoyés* : suivre les transferts sortants (et en assigner un livreur si
  besoin).

### Historique

- Deux onglets : **Historique des ventes** et **Historique des clôtures**.
- Chaque onglet a sa **propre barre de filtres** : **date de début**, **date de
  fin**, **recherche** (n° de ticket, n° de clôture, client…).
- Affichage **du jour** par défaut, **pagination** en bas de tableau.
- Les filtres et la pagination sont **conservés** pendant la navigation.

### Bonnes pratiques
- **Clôturer la caisse** chaque soir.
- Rattacher les ventes aux **clients fidélité** pour créditer leurs points.

---

## 9. Rôle — Livreur

Le **Livreur** livre les **commandes en ligne** et les **transferts de stock**
qui lui sont assignés. Il peut intervenir dans **une ou plusieurs villes**.

### Menu (regroupé en catégories)

- **Livraisons** → *Livraisons* · *Historique des livraisons*
- **Suivi** → *Actualités*
- **Configuration** → *Paramètres*

### La page « Livraisons » (à livrer)

Affiche **tout ce qui lui est assigné et n'est pas encore livré** :

- **Commandes en ligne** assignées au livreur ;
- **Transferts de stock** assignés au livreur (inter-magasins ou dépôt ↔ magasin).

Un **filtre par dates** (Date début / Date fin) est disponible. **Par défaut,
toutes** les commandes/transferts assignés non livrés sont visibles (aucun filtre
de date imposé).

### Comment ça marche — pas à pas

**Pour une commande en ligne**
1. Le magasin prépare la commande et **assigne le livreur**.
2. Elle apparaît dans **« Livraisons »** (visible tant qu'elle n'est pas livrée).
3. Le livreur met à jour le statut :
   - **Livré** → la commande passe dans **« Historique des livraisons »** ;
   - **Retour** → saisir une **note obligatoire** (motif) → quitte la liste active.

**Pour un transfert de stock**
1. Le magasin/dépôt source prépare le transfert et **remet le colis au livreur**.
2. Le transfert apparaît dans **« Livraisons »** (section transferts).
3. Le livreur clique **« Prendre en charge »** (si *Prête*) puis **« Marquer
   livré »** une fois déposé.
4. La **destination valide la réception** → stock crédité, transfert **terminé**.

### Historique des livraisons

- Regroupe les **commandes livrées/clôturées** et les **transferts livrés/reçus**
  assignés au livreur.
- Filtre par dates ; **« Cette semaine »** par défaut.

### Bonnes pratiques
- Mettre à jour le statut **dès** la livraison.
- Toujours **documenter un retour** avec une note claire.

---

## 10. Fonctionnalités en détail

Cette section décrit les fonctionnalités transversales, communes à plusieurs
rôles.

### 10.1 Stock & transferts
Le stock est **par magasin** et **par dépôt**. Toute vente, annulation ou
transfert met le stock à jour. Les transferts suivent les statuts décrits au
[§3.B](#b-le-flux-du-stock-transferts-magasin--dépôt) ; la **réception doit être
validée** par la destination pour créditer le stock.

### 10.2 Annulations de stock
Permet de **retirer du stock** pour casse, perte, péremption, erreur, etc. Selon
la configuration du directeur, l'annulation peut nécessiter une **validation**
(par établissement). L'opération est tracée dans l'historique.

### 10.3 Caisse, ticket & paiements
- Paiements : **espèces**, **carte**, **chèque** (et règlement des commandes en
  ligne).
- **Ticket** thermique 58/80 mm, centré, hauteur auto, aperçu = impression,
  réimpression depuis l'historique.

### 10.4 Clients fidélité
- **Équipe** : créer/rechercher une **carte**, consulter **points** et
  **historique**. Rattacher une vente à un client **crédite des points**.
- **Client** : carte en ligne (PWA) sur **https://loyalty.natusmarrakech.com**
  (points, commandes, factures).
- La fiche client affiche l'**historique de ses achats** (sans bloc « notes »).

### 10.5 Clients Pro
- **Équipe** : gérer les clients **professionnels** ; la fiche inclut
  **l'historique de tous leurs achats** (la page « commandes » a été remplacée
  par cet historique complet).
- **Client** : espace dédié (PWA) sur **https://pro.natusmarrakech.com**.
  Inscription via un **lien / QR** fourni par le magasin.

### 10.6 Factures
Génération et consultation des **factures** liées aux ventes. Les ventes issues
d'une commande en ligne sont identifiées par un **badge** spécifique.

### 10.7 Chèques
Suivi des **chèques** reçus (encaissement, suivi des échéances).

### 10.8 Clôtures de caisse
Arrêt de caisse de fin de journée. Le directeur définit si la clôture exige un
**code gérant** ou non. L'affichage de la page de clôture **s'adapte** à cette
configuration.

### 10.9 Réclamations
- **Client** : formulaire public (avec **photo** possible).
- **Équipe** (directeur/gérant) : menu **Réclamations** ; **« Voir »** affiche le
  détail **et la photo** jointe.

### 10.10 Planning
Saisie des **caissiers** et de leurs **créneaux** par magasin. C'est ici que se
gèrent les noms des caissiers (compte caisse partagé).

### 10.11 Catalogue (Produits, Catégories, Fabrication)
- **Produits** : référentiel des articles (codes, codes-barres, images…).
- **Catégories des produits** : classement utilisé dans les statistiques.
- **Fabrication** : produits/éléments fabriqués (gérés aussi côté dépôt via
  *Stock des fabrications*).

### 10.12 Accès stock
Le directeur définit **qui** peut agir sur le stock et **avec quels droits**.

### 10.13 Notifications
- **Rupture en magasin** → notification au **gérant** et au **directeur**.
- **Rupture au dépôt** → notification au **dépôt** et au **directeur**.
- **Transfert envoyé** → notification au **destinataire** (magasin/dépôt) jusqu'à
  la **réception** ; ce n'est **pas** le directeur qui envoie.
- Côté caisse, un **badge** sur **« Commander »** signale les ruptures ; une fois
  le produit commandé/envoyé, l'alerte **disparaît**.

### 10.14 Historique / Journal
- **Directeur** : 3 onglets (Journal du directeur, Ventes, Clôtures).
- **Caissier** : 2 onglets (Ventes, Clôtures) avec filtres et pagination.
- Les autres rôles disposent d'un historique adapté à leur périmètre.

### 10.15 Actualités (Actus)
Publication d'**actualités internes** visibles par les équipes (informations,
consignes…).

### 10.16 Paramètres
Réglages du compte et, pour le directeur, **configuration de la plateforme**
(ex. clôture avec/sans code gérant).

---

## 11. Clients & pages publiques

En plus des comptes équipes, la plateforme propose des **espaces publics** pour
les clients, **sans connexion équipe**, sous des **sous-domaines dédiés** et
installables en application (PWA).

### Carte de fidélité
- **Adresse** : **https://loyalty.natusmarrakech.com**
- Le client consulte ses **points**, ses **commandes** et ses **factures**.
- Application **installable** (PWA).

### Espace client Pro
- **Adresse** : **https://pro.natusmarrakech.com**
- Espace réservé aux clients **professionnels** ; **inscription** via lien / QR
  fourni par le magasin.
- Application **installable** (PWA).

### Réclamations
- **Adresse** : **https://reclamations.natusmarrakech.com**
- Formulaire de réclamation avec **photo** possible. Page **séparée** du reste du
  site (sous-domaine dédié).

### Suivi de commande
- Le client reçoit un **lien de suivi** de sa commande en ligne (page
  `/commande/...`) pour voir l'avancement (préparée → en livraison → livrée).

---

## 12. Adresses & accès

| Espace | Adresse | Pour qui |
|--------|---------|----------|
| Application (équipes) | https://os.natusmarrakech.com/login | Directeur, Gérant, Dépôt, Caissier, Livreur |
| Carte de fidélité | https://loyalty.natusmarrakech.com | Clients fidèles |
| Espace client Pro | https://pro.natusmarrakech.com | Clients professionnels |
| Réclamations | https://reclamations.natusmarrakech.com | Tous les clients |

Chaque membre de l'équipe se connecte avec **son e-mail et son mot de passe** ;
selon son **rôle**, il n'accède **qu'aux menus qui le concernent**.

---

## 13. Questions fréquentes

**Un produit en rupture, comment le réapprovisionner ?**
Le caissier ouvre **« Commander »** (badge de ruptures), choisit le dépôt source,
saisit les quantités et valide. Le dépôt envoie, le magasin **valide la
réception**.

**Pourquoi un transfert n'augmente-t-il pas tout de suite le stock ?**
Parce que la **réception** doit d'abord être **validée** par la destination
(*Stocks reçus*). Tant que ce n'est pas fait, le transfert reste « en attente ».

**Un livreur peut-il livrer dans plusieurs villes ?**
Oui. Le livreur n'est **pas** limité à une ville.

**Une commande livrée disparaît-elle ?**
Non, elle passe dans **« Historique des livraisons »**.

**Faut-il un compte par caissier ?**
Non. Le magasin a **un compte caisse partagé** ; les **noms des caissiers** se
gèrent dans le **Planning**.

**La plateforme gère-t-elle une boutique externe ?**
Non. Il n'y a que **les commandes** (en magasin et en ligne) et **les transferts
de stock** entre magasins et dépôts.
