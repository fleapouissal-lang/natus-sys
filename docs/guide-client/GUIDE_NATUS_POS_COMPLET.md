# Natus POS — Guide complet (document client)

**Éditeur :** Natus Cosmétiques — Marrakech  
**Plateforme :** Natus POS  
**URL production :** [https://os.natusmarrakech.com/login](https://os.natusmarrakech.com/login)  
**Version application :** 0.1.0  
**Public :** Direction, gérants, caissiers, hub logistique, livreurs  
**Dernière mise à jour :** juin 2026

---

## Table des matières

1. [Introduction](#1-introduction)
2. [Connexion et installation](#2-connexion-et-installation)
3. [Les rôles et leurs périmètres](#3-les-rôles-et-leurs-périmètres)
4. [Menus par rôle](#4-menus-par-rôle)
5. [Caisse (POS)](#5-caisse-pos)
6. [Fidélité et Clients Pro](#6-fidélité-et-clients-pro)
7. [Factures](#7-factures)
8. [Clôture de caisse et Z-report](#8-clôture-de-caisse-et-z-report)
9. [Commandes web Shopify](#9-commandes-web-shopify)
10. [Stock, transferts et retours](#10-stock-transferts-et-retours)
11. [Chèques, planning, actualités](#11-chèques-planning-actualités)
12. [Réclamations](#12-réclamations)
13. [Notifications dans l’application](#13-notifications-dans-lapplication)
14. [WhatsApp client](#14-whatsapp-client)
15. [Pages publiques (clients finaux)](#15-pages-publiques-clients-finaux)
16. [Mobile vs ordinateur](#16-mobile-vs-ordinateur)
17. [Matrice des permissions](#17-matrice-des-permissions)
18. [Routines quotidiennes](#18-routines-quotidiennes)
19. [Glossaire](#19-glossaire)
20. [FAQ](#20-faq)
21. [Support](#21-support)

---

## 1. Introduction

### 1.1 Qu’est-ce que Natus POS ?

Natus POS est la plateforme unique de Natus Cosmétiques. Elle regroupe :

| Domaine | Description |
|---------|-------------|
| **Caisse magasin** | Ventes, scan code-barres, fidélité, chèques, tickets et factures |
| **Commandes web** | Commandes Shopify : préparation, livraison, retours |
| **Logistique hub** | Entrepôt central, transferts vers les magasins |
| **Fidélité** | Carte digitale, points, réductions en caisse |
| **Clients Pro** | Comptes professionnels avec remise dédiée |
| **WhatsApp** | Confirmations, statuts commande, avis, win-back |
| **Direction** | Tableaux de bord, utilisateurs, réclamations, clôtures |

Chaque collaborateur dispose de **son propre compte**. L’interface affiche uniquement les menus autorisés pour son **rôle** et son **magasin / ville**.

### 1.2 Magasins et réseau

Le réseau couvre les boutiques Natus (ex. Guéliz, Médina) et le **hub logistique** de Marrakech. Le directeur voit l’ensemble ; les autres rôles sont limités à leur périmètre.

---

## 2. Connexion et installation

### 2.1 Se connecter

**Adresse :** [https://os.natusmarrakech.com/login](https://os.natusmarrakech.com/login)

| Champ | Description |
|-------|-------------|
| **Email** | Adresse fournie par la direction |
| **Mot de passe** | Mot de passe communiqué à la création du compte |

Après connexion, vous êtes redirigé vers l’**accueil de votre rôle** (caisse, gérant, directeur, etc.).

**Sécurité :**

- Déconnexion automatique après **15 minutes d’inactivité**
- **Exception :** terminal **caisse magasin** sur l’écran POS — pas de déconnexion auto sur la caisse
- Changez votre mot de passe dans **Paramètres** si la direction vous le demande

### 2.2 Installer l’application (PWA)

Sur la page login, un **bandeau jaune** propose d’installer Natus sur l’écran d’accueil (mobile ou ordinateur), environ 2 secondes après l’ouverture de la page.

| Plateforme | Procédure |
|------------|-----------|
| **Chrome / Edge** | Cliquer **Installer** dans le bandeau |
| **iPhone** | Touche **Partager** → **Sur l’écran d’accueil** |
| **Ignorer** | **Plus tard** — le bandeau ne réapparaît plus sur ce navigateur |

Utile pour consulter planning, commandes ou actualités sans passer par le navigateur.

### 2.3 Paramètres personnels

Tous les rôles disposent d’une page **Paramètres** :

- Photo de profil
- Changement de mot de passe

Chemins : `/director/settings`, `/manager/settings`, `/cashier/settings`, `/hub/settings`, `/livreur/settings`

---

## 3. Les rôles et leurs périmètres

| Rôle | Libellé affiché | Qui ? | Périmètre | Appareil conseillé |
|------|-----------------|-------|-----------|-------------------|
| Directeur | Directeur | Direction, propriétaire | Tous magasins, toutes villes | Ordinateur |
| Admin | Administrateur | IT / super-admin | Identique au directeur | Ordinateur |
| Gérant | Gérant | Responsable magasin / ville | Magasin(s) de sa ville | Ordinateur + mobile |
| Caissier | Caissier | Vendeur boutique | Son magasin | Caisse + mobile |
| Hub | Dépôt | Responsable entrepôt | Ville / hub assigné | Ordinateur |
| Livreur | Livreur | Livraison commandes web | Son magasin | Smartphone |

### Schéma organisationnel

```
                    ┌─────────────┐
                    │  Directeur  │
                    │  / Admin    │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌──────────┐     ┌──────────┐      ┌──────────┐
   │  Gérant  │     │   Hub    │      │ Livreur  │
   │ (ville)  │     │(entrepôt)│      │(livraison)│
   └────┬─────┘     └────┬─────┘      └──────────┘
        │                │
        ▼                │ transferts stock
   ┌──────────┐          │
   │ Caissier │◄─────────┘
   │ (magasin)│
   └──────────┘
```

### Types de comptes caissier

| Type | Exemple | Usage |
|------|---------|-------|
| **Caissier personnel** | `prenom.magasin@natus.ma` | Ventes au nom du vendeur |
| **Caisse magasin** | `caisse.magasin@natus.ma` | Terminal fixe ; identification vendeur par **badge NFC** ou mot de passe opérateur |

---

## 4. Menus par rôle

Les libellés ci-dessous correspondent exactement à la barre latérale de l’application.

### 4.1 Directeur / Administrateur

| Menu | Route | Utilité |
|------|-------|---------|
| Accueil | `/director` | Tableau de bord réseau |
| Planning | `/director/planning` | Shifts et repos des caissiers |
| Caisse | `/cashier/pos` | Encaissement (PC uniquement) |
| Clôtures caisse | `/director/pos-closures` | Supervision clôtures, Z-report |
| Ventes | `/director/sales` | Historique ventes |
| Chèques | `/director/cheques` | Registre chèques |
| Stock | `/director/stock` | Stock tous magasins + hub |
| Commandes envoyées | `/director/stock-transfers` | Transferts sortants |
| Commandes reçues | `/director/stock-transfers/received` | Transferts entrants |
| Produits | `/director/products` | Catalogue, codes-barres |
| Magasins | `/director/stores` | Fiches magasins |
| Historique | `/director/activity` | Journal opérations |
| Réclam. | `/director/reclamations` | Plaintes clients |
| Retours stock | `/director/writeoffs` | Validation retours périmés/cassés |
| Accès stock | `/director/stock-access` | Demandes accès temporaire stock |
| Catégories caisse | `/director/categories` | Images cartes catégories POS |
| Clients fidélité | `/director/clients` | Fiches clients fidélité |
| Clients Pro | `/director/pro-clients` | Comptes professionnels |
| Factures | `/director/invoices` | Validation et export factures |
| Actus | `/director/actualites` | Annonces internes |
| Users | `/director/users` | Comptes utilisateurs |
| Dépôts | `/director/hubs` | Comptes hub logistique |
| Paramètres | `/director/settings` | Profil et mot de passe |

**Pages hors menu (accès direct ou notifications) :**

- Commandes Shopify : `/director/orders`
- Programme fidélité (paramètres points) : `/director/loyalty`

### 4.2 Gérant

| Menu | Route | Utilité |
|------|-------|---------|
| Accueil | `/manager` | KPI magasin |
| Planning | `/manager/planning` | Planning équipe + création caissiers |
| Caisse | `/cashier/pos` | Réservé PC (encaissement via caissiers en pratique) |
| Clôtures caisse | `/manager/pos-closures` | Validation clôtures, codes gérant |
| Ventes | `/manager/sales` | Ventes du magasin |
| Chèques | `/manager/cheques` | Chèques reçus |
| Stock | `/manager/stock` | Stock et ajustements magasin |
| Commandes envoyées | `/manager/stock-transfers` | Demandes vers hub / autres magasins |
| Commandes reçues | `/manager/stock-transfers/received` | Réceptions |
| Magasins | `/manager/stores` | Fiches magasins ville |
| Historique | `/manager/activity` | Opérations magasin |
| Réclam. | `/manager/reclamations` | Traitement plaintes |
| Retours stock | `/manager/writeoffs` | Validation retours caissiers |
| Factures | `/manager/invoices` | Factures validées (consultation) |
| Actus | `/manager/actualites` | Annonces équipe |
| Paramètres | `/manager/settings` | Profil |

**Hors menu :** Commandes Shopify → `/manager/orders` (lien direct ou cloche notifications)

### 4.3 Caissier

| Menu | Route | Utilité |
|------|-------|---------|
| Caisse | `/cashier/pos` | Terminal de vente |
| Horaires | `/cashier/planning` | Shifts et repos |
| Actualités | `/cashier/actualites` | Infos magasin / réseau |
| Historique de vente | `/cashier/sales` | Ventes |
| Historique clôtures | `/cashier/pos-closures` | Clôtures passées |
| Notes | `/cashier/notes` | Notes clients (compte caisse magasin) |
| Commandes envoyées | `/cashier/transfers/sent` | Demandes stock |
| Commandes reçues | `/cashier/transfers/received` | Réceptions stock |
| Clients fidélité | `/cashier/customers` | Recherche client, points |
| Clients Pro | `/cashier/pro-clients` | Comptes pro en boutique |
| Retours | `/cashier/returns` | Déclaration retours stock magasin |
| Factures | `/cashier/invoices` | Factures validées |
| Chèques | `/cashier/cheques` | Suivi chèques |
| Paramètres | `/cashier/settings` | Profil |
| **Clôture du jour** | *(bas sidebar)* | Fin de journée — ticket 80 mm |

**Hors menu :** Commandes Shopify → `/cashier/orders`

### 4.4 Hub (dépôt logistique)

| Menu | Route | Utilité |
|------|-------|---------|
| Accueil | `/hub` | Vue d’ensemble hub |
| Stock | `/hub/stock` | Stock par magasin |
| Entrepôt | `/hub/hub-stock` | Stock central + envoi magasin |
| Commandes | `/hub/orders` | Commandes dépôt |
| Retours stock | `/hub/writeoffs` | Retours entrepôt |
| Historique | `/hub/activity` | Mouvements |
| Actus | `/hub/actualites` | Annonces |
| Paramètres | `/hub/settings` | Profil |

### 4.5 Livreur

| Menu | Route | Utilité |
|------|-------|---------|
| Actualités | `/livreur/actualites` | Infos magasin |
| Livraisons | `/livreur/orders` | Commandes à livrer |
| Transferts | `/livreur/transfers` | Transferts assignés |
| Retours | `/livreur/returns` | Retours livraison |
| Paramètres | `/livreur/settings` | Profil |

---

## 5. Caisse (POS)

**Route :** `/cashier/pos`  
**Menu :** Caisse

### 5.1 Ouvrir la caisse

1. Se connecter (compte caissier ou **caisse magasin**)
2. Si terminal magasin : **badger** avec la carte NFC du vendeur ou saisir l’opérateur
3. Choisir les **catégories** (cartes visuelles) ou **scanner** un code-barres

### 5.2 Passer une vente

1. Ajouter produits au panier (scan ou catalogue)
2. Modifier quantités si besoin
3. Associer un **client fidélité** (QR carte ou téléphone)
4. Appliquer **points fidélité** et/ou **code promo** (cumulables, sauf Client Pro actif)
5. Choisir le mode de paiement :
   - **Espèces** (monnaie calculée automatiquement)
   - **Carte** (TPE)
   - **Chèque**
6. Valider la vente
7. Imprimer le **ticket caisse**

### 5.3 Commande Shopify en caisse

Une commande web **préparée** peut être encaissée depuis la caisse (commande payée en ligne ou COD selon le cas).

### 5.4 Annulation de vente

| Rôle | Règle |
|------|-------|
| Caissier | Ses ventes uniquement, dans les **24 h** |
| Gérant / Directeur | Magasin / réseau, sans limite 24 h |

### 5.5 Catégories caisse (configuration directeur)

Le directeur configure les **images** des cartes catégories dans **Catégories caisse** (`/director/categories`).

- Une catégorie apparaît à la caisse si elle contient **au moins 1 produit**
- La suppression d’une catégorie retire les produits associés (sauf articles déjà vendus)

---

## 6. Fidélité et Clients Pro

### 6.1 Programme fidélité

**Paramètres (directeur) :** `/director/loyalty`

- Montant en MAD pour 1 point
- Valeur d’un point en réduction
- Seuil minimum pour utiliser les points

**En caisse :**

1. Menu **Clients fidélité** ou scan QR en caisse
2. Rechercher par téléphone ou nom
3. Appliquer points ou consulter l’historique

**Carte client (public) :** lien `/carte/[token]` — points, QR, ajout écran d’accueil

### 6.2 Clients Pro

- Remise automatique **−34 %** en caisse (libellé « Remise Client Pro »)
- Pas de cumul code promo + Client Pro
- Inscription : QR en magasin → formulaire public
- Gestion : **Clients Pro** (directeur, caissier)

---

## 7. Factures

### 7.1 Principe

Chaque vente génère une **facture automatique**. Elle doit être **validée par le directeur** avant d’être visible en magasin.

| État | Signification |
|------|---------------|
| **En attente directeur** | Créée, non publiée au magasin |
| **Validée** | Visible caissier / gérant, imprimable, téléchargeable |

### 7.2 Valider une facture (directeur)

1. Menu **Factures** → ouvrir la vente
2. Vérifier ou corriger le **client** : nom, téléphone, email, ICE
3. Cliquer **Valider la facture**

### 7.3 Imprimer et télécharger

| Action | Rendu |
|--------|--------|
| **Télécharger** | Fichier HTML aux **couleurs Natus** (crème / or) |
| **Imprimer** | Même mise en page en **noir et blanc** |

Les factures longues sont paginées sur **plusieurs pages A4** :

- Colonnes répétées sur chaque page
- Bandeau « Facture N° … » sur les pages suivantes
- Numérotation **Page 1 / N** en bas

### 7.4 Caissier / gérant

- Menu **Factures** : uniquement les factures **validées**
- Après vente : **ticket** immédiat ; **facture** après validation direction

---

## 8. Clôture de caisse et Z-report

### 8.1 Caissier — fin de journée

1. Cliquer **Clôture du jour** (bas de la barre latérale caisse)
2. Vérifier la synthèse : transactions, espèces, TPE, chèque
3. Si **code gérant requis** (paramètre directeur) : saisir le code transmis par le gérant
4. Imprimer le **ticket clôture 80 mm** ou télécharger le HTML

Le ticket liste les **articles vendus** (désignation, qté, P.U., total) et le **total CA TTC**.

### 8.2 Gérant

**Menu :** Clôtures caisse (`/manager/pos-closures`)

1. Recevoir la demande de clôture du caissier
2. Générer / transmettre le **code gérant** (valide 2 h)
3. **Valider** la clôture pour fermer la journée métier
4. Consulter l’**historique** :
   - **Ticket 80 mm** — synthèse + articles agrégés
   - **Rapport A4** — **toutes les ventes** du jour (détail par transaction)

### 8.3 Directeur

**Menu :** Clôtures caisse (`/director/pos-closures`)

1. Configurer : clôture **avec code gérant** ou **clôture directe** en caisse
2. Superviser les validations en attente
3. **Z-report** : export Excel analytique multi-magasins / périodes (depuis l’historique)

---

## 9. Commandes web Shopify

### 9.1 Accès

Les commandes web ne figurent pas dans le menu latéral principal. Accès via :

- **Cloche notifications** (nouvelle commande)
- Lien direct : `/manager/orders`, `/cashier/orders`, `/director/orders`

### 9.2 Statuts (libellés affichés)

| Statut | Libellé |
|--------|---------|
| En attente | Commande reçue |
| En préparation | Préparation en magasin |
| Prête | Prête à livrer / retirer |
| En cours de livraison | Livreur en route |
| Bien livré | Livraison confirmée |
| Retour | Retour client |
| Payée | Paiement enregistré |
| Annulée | Commande annulée |

**Types de paiement :** **E.L** (en ligne) ou **COD** (paiement à la livraison)

### 9.3 Workflow magasin

1. Nouvelle commande → notification **cloche** (+ son)
2. Passer le statut : En attente → En préparation → Prête
3. Assigner un **livreur** ou remettre en caisse
4. Client informé par **WhatsApp** à chaque changement de statut
5. Transférer vers un autre magasin si besoin

### 9.4 Workflow livreur

1. **Livraisons** (`/livreur/orders`)
2. Prendre les commandes **Prête** / **En cours de livraison**
3. Marquer **Bien livré** ou **Retour** (note obligatoire en cas de retour)

---

## 10. Stock, transferts et retours

### 10.1 Alertes stock

| Seuil | Alerte |
|-------|--------|
| Stock bas | Notification cloche (magasin ou hub) |
| Rupture (0) | Alerte prioritaire |

### 10.2 Caissier — demander du stock

1. **Commandes envoyées** → destination (hub ou magasin)
2. Saisir quantités + note
3. Suivre la réception dans **Commandes reçues**

### 10.3 Hub — envoyer vers un magasin

1. **Entrepôt** (`/hub/hub-stock`)
2. Choisir le magasin destination
3. Saisir les quantités → **Transférer**

### 10.4 Gérant — transferts

**Commandes envoyées** / **Commandes reçues** — échanges entre magasin et hub ou entre magasins.

### 10.5 Retours stock (produits périmés / cassés)

> **Attention :** distinct des **retours commande Shopify** (livreur).

| Rôle | Menu | Action |
|------|------|--------|
| Caissier | **Retours** | Déclarer un produit |
| Gérant | **Retours stock** | Valider → déduction stock magasin |
| Hub | **Retours stock** | Déclarer (validation **directeur**) |
| Directeur | **Retours stock** | Valider tout périmètre |

### 10.6 Accès stock temporaire (gérant)

1. Gérant : demande depuis la page **Stock**
2. Directeur : **Accès stock** → approuver ou refuser
3. Durée limitée pour modifier le stock magasin

---

## 11. Chèques, planning, actualités

### 11.1 Chèques

**Menu :** Chèques (caissier, gérant, directeur)

Registre des paiements par chèque : montant, statut, lien avec la vente.

### 11.2 Planning

**Gérant / directeur —** `/manager/planning` ou `/director/planning`

1. Sélectionner magasin et semaine
2. Planifier **shifts** et **jours de repos**
3. **Ajouter un caissier** (création compte caissier ou livreur)
4. Transferts temporaires entre magasins

**Caissier —** menu **Horaires** : consultation seule

### 11.3 Actualités

| Rôle | Menu | Droits |
|------|------|--------|
| Caissier, livreur | Actualités | Lecture |
| Gérant, directeur, hub | Actus | Lecture + publication annonces |

---

## 12. Réclamations

### 12.1 Côté staff

**Menu :** Réclam. → **Réclamations clients**

Plaintes reçues via formulaire web ou WhatsApp. Traitement par gérant ou directeur.

### 12.2 Côté client public

**Page :** `/reclamation`

Types : réclamation **service** (magasin), réclamation **commande** (web), **autre**.

Champs : ville, magasin, coordonnées, n° commande, message, photo optionnelle.

---

## 13. Notifications dans l’application

| Type | Message type | Destinataires |
|------|--------------|---------------|
| Nouvelle commande | « Nouvelle commande reçue » | Magasin, gérant, directeur |
| Transfert commande | « Commande transférée » | Magasin destinataire |
| Transfert hub | « Commande / livraison dépôt » | Caissier, gérant, livreur |
| Stock bas | « Produit sous le seuil » | Magasin, hub, directeur |
| Rupture | « Produit en rupture » | Idem |

**Comportement :**

- **Cloche** en haut de l’écran (+ barre jaune sur la caisse)
- Sons distincts selon le type
- Clic sur la notification → page concernée (commandes, stock, transferts)

---

## 14. WhatsApp client

| Événement | Contenu envoyé au client |
|-----------|--------------------------|
| Nouvelle commande web | Confirmation + lien suivi `/commande/[token]` |
| Changement statut | En préparation, Prête, En livraison, Bien livré |
| ~2 h après livraison | Demande d’avis / feedback |
| Après vente magasin (fidélité) | Feedback boutique |
| Client inactif 60 jours | Win-back + code promo unique 24 h |
| Message entrant | Bot automatique (FR / Darija) |
| Carte fidélité | Lien `/carte/[token]` |

---

## 15. Pages publiques (clients finaux)

Sans compte staff — accessibles par lien WhatsApp, QR ou email.

| Page | Route | Usage |
|------|-------|-------|
| Carte fidélité | `/carte/[token]` | Points, QR, PWA client |
| Suivi commande | `/commande/[token]` | Statut commande web |
| Réclamation | `/reclamation` | Formulaire plainte |
| Avis Google | `/avis-google` | Redirection avis Google |
| Fiche produit | `/produit/[id]` | Présentation produit |
| Inscription Client Pro | `/client-pro/inscription-normale/[storeToken]` | QR magasin |

---

## 16. Mobile vs ordinateur

| Profil | Ordinateur | Mobile |
|--------|------------|--------|
| Directeur / Admin | Accès complet, caisse OK | Caisse **non disponible** ; consultation |
| Gérant | Tableau de bord, stock, commandes | Consultation ; pas de caisse |
| Caissier standard | Caisse + tous menus | Caisse + menus |
| Caissier (magasin avec terminal POS) | Caisse sur PC fixe | **Horaires** (+ notes, clôtures) |
| Compte caisse magasin | Caisse NFC | Planning, notes, clôtures |
| Hub | Entrepôt, stock | Consultation + transferts |
| Livreur | Livraisons | **Priorité smartphone** |

Barre du bas mobile : **4 raccourcis** + menu **Plus** pour le reste.

---

## 17. Matrice des permissions

| Action | Directeur | Gérant | Caissier | Hub | Livreur |
|--------|:---------:|:------:|:--------:|:---:|:-------:|
| Voir tous les magasins | ✅ | ❌ ville | ❌ sien | ❌ ville | ❌ sien |
| Caisse POS | ✅ PC | ❌* | ✅ | ❌ | ❌ |
| Valider factures | ✅ | ❌ | ❌ | ❌ | ❌ |
| Clôture jour (ticket) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Valider clôture (code) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Z-report Excel | ✅ | ❌ | ❌ | ❌ | ❌ |
| Créer gérant / hub | ✅ | ❌ | ❌ | ❌ | ❌ |
| Créer caissier / livreur | ✅ | ✅ | ❌ | ❌ | ❌ |
| Catégories caisse | ✅ | ❌ | ❌ | ❌ | ❌ |
| Paramètres fidélité | ✅ | ❌ | ❌ | ❌ | ❌ |
| Stock magasin | ✅ | ✅ | ❌ | ✅ | ❌ |
| Stock entrepôt | ✅ | ❌ | ❌ | ✅ | ❌ |
| Transfert hub → magasin | ✅ | ❌ | ❌ | ✅ | ❌ |
| Commandes Shopify | ✅ | ✅ | ✅ | ❌ | ✅ |
| Réclamations | ✅ | ✅ | ❌ | ❌ | ❌ |
| Retours stock | ✅ | ✅ | Déclarer | Déclarer | ❌ |
| Chèques | ✅ | ✅ | ✅ | ❌ | ❌ |
| Planning (éditer) | ✅ | ✅ | Lecture | ❌ | ❌ |
| Annuler vente (24 h) | ✅ | ✅ | ✅ siennes | ❌ | ❌ |

\*Le gérant voit un lien Caisse mais l’encaissement se fait via compte caissier ou terminal magasin.

---

## 18. Routines quotidiennes

### Ouverture

- [ ] Gérant : commandes en attente + stock critique
- [ ] Caissier : ouvrir **Caisse** ou badger sur terminal NFC
- [ ] Hub : traiter transferts de la veille
- [ ] Directeur : factures en attente de validation

### Pendant la journée

- [ ] Scanner les produits (traçabilité stock)
- [ ] Proposer la **carte fidélité**
- [ ] Mettre à jour les statuts commandes web
- [ ] Traiter les notifications cloche

### Fermeture

- [ ] **Clôture du jour** (caissier)
- [ ] Validation gérant si code requis
- [ ] Contrôle **Ventes** du jour
- [ ] Directeur : factures en attente
- [ ] Signaler ruptures au hub

---

## 19. Glossaire

| Terme | Définition |
|-------|------------|
| **POS** | Point of sale — terminal caisse |
| **PWA** | Application installable depuis le navigateur |
| **COD** | Cash on delivery — paiement à la livraison |
| **E.L** | Paiement en ligne (Shopify) |
| **Hub** | Entrepôt logistique central |
| **Writeoff / Retours stock** | Produit périmé ou cassé retiré du stock |
| **Clôture** | Fin de journée caisse — ticket ou rapport |
| **Z-report** | Export Excel analytique des clôtures (directeur) |
| **Client Pro** | Compte professionnel avec remise −34 % |
| **ICE** | Identifiant fiscal client (factures) |

---

## 20. FAQ

**Pourquoi je ne vois pas la Caisse sur mobile ?**  
La caisse est réservée à l’ordinateur pour les directeurs et gérants. Les caissiers peuvent utiliser la caisse mobile sauf si leur magasin impose le terminal fixe (alors : Horaires uniquement sur téléphone).

**Où sont les commandes web ?**  
Ouvrir `/manager/orders`, `/cashier/orders` ou cliquer la **cloche** lors d’une nouvelle commande.

**Pourquoi la facture n’apparaît pas en magasin ?**  
Elle est en attente de **validation directeur** (menu Factures).

**Différence Retours caissier vs retours livreur ?**  
**Retours** (caissier) = produit périmé/cassé en magasin. **Retours** (livreur) = client refuse la commande web.

**Comment installer l’app ?**  
Bandeau jaune sur la page login → Installer (ou Partager sur iPhone).

---

## 21. Support

| Besoin | Contact |
|--------|---------|
| Nouveau compte / mot de passe oublié | Directeur ou administrateur Natus |
| Problème technique plateforme | Support technique (équipe développement) |
| Réclamation client en magasin | Gérant via **Réclam.** |
| Réclamation client web | Lien [https://os.natusmarrakech.com/reclamation](https://os.natusmarrakech.com/reclamation) |

---

*Document client Natus Cosmétiques — Marrakech · juin 2026*  
*Plateforme : [https://os.natusmarrakech.com](https://os.natusmarrakech.com)*
