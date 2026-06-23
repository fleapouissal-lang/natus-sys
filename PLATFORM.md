# Natus POS — Documentation plateforme

Application de caisse, fidélité, commandes Shopify et marketing WhatsApp pour **Natus Cosmétiques** (Guéliz, Médina, hub logistique — Marrakech).

**Repo :** https://github.com/fleapouissal-lang/natus-sys  
**Version :** 0.1.0  
**Langue UI :** Français (`lang="fr"`)

---

## Table des matières

1. [Stack technique](#1-stack-technique)
2. [Rôles et permissions](#2-rôles-et-permissions)
3. [Routes et pages](#3-routes-et-pages)
4. [Fonctionnalités par module](#4-fonctionnalités-par-module)
5. [Base de données Supabase](#5-base-de-données-supabase)
6. [Variables d'environnement](#6-variables-denvironnement)
7. [Scripts npm](#7-scripts-npm)
8. [Architecture du code](#8-architecture-du-code)
9. [Comportement mobile vs desktop](#9-comportement-mobile-vs-desktop)
10. [API et crons](#10-api-et-crons)
11. [Design system](#11-design-system)
12. [Installation et déploiement](#12-installation-et-déploiement)

---

## 1. Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | **Next.js 16** (App Router, Turbopack) |
| UI | **React 19**, **Tailwind CSS 4**, **lucide-react** |
| Auth / BDD | **Supabase** (PostgreSQL, RLS, Auth) |
| E-commerce | **Shopify** (commandes web, webhooks) |
| Messaging | **Kapso** (WhatsApp) + **Gemini** (bot conversationnel) |
| Utilitaires | `react-barcode`, `react-qr-code` |
| Tooling | TypeScript 5, ESLint 9, tests Node (`tests/*.test.mjs`) |

### Fichiers de configuration clés

| Fichier | Rôle |
|---------|------|
| `middleware.ts` | Délègue à `lib/supabase/middleware.ts` (auth, guards par rôle) |
| `next.config.ts` | Headers sécurité, config Turbopack |
| `vercel.json` | Planification des crons Vercel |
| `app/globals.css` | Tokens couleur, composants Natus (`.natus-card`, `.natus-field`) |

---

## 2. Rôles et permissions

### Rôles (`lib/types.ts`)

```ts
type UserRole = "directeur" | "admin" | "manager" | "cashier" | "livreur" | "hub";
```

| Rôle | Label UI | Accueil | Description |
|------|----------|---------|-------------|
| `directeur` | Directeur | `/director` | Accès global : tous magasins, utilisateurs, hubs |
| `admin` | Administrateur | `/director` | Quasi identique au directeur (`isDirector()`) |
| `manager` | Gérant | `/manager` | Gestion d'un ou plusieurs magasins (ville) |
| `cashier` | Caissier | `/cashier/pos` | Caisse, ventes, fidélité, commandes |
| `hub` | Hub stock | `/hub` | Entrepôt logistique, transferts inter-magasins |
| `livreur` | Livreur | `/livreur/orders` | Livraisons commandes Shopify |

### Guards middleware (`lib/supabase/middleware.ts`)

Préfixes protégés : `/manager`, `/director`, `/hub`, `/cashier`, `/livreur`, `/pos`

| Préfixe | Rôles autorisés |
|---------|-----------------|
| `/director` | `directeur`, `admin` |
| `/manager` | `manager` |
| `/hub` | `hub` |
| `/livreur` | `livreur` |
| `/cashier` | `cashier`, `manager`, `directeur`, `admin` |

> Le layout `app/cashier/layout.tsx` restreint davantage : `requireRole(["directeur", "manager", "cashier"])` — le rôle **hub** n'accède pas aux pages caissier.

### Helpers permissions (`lib/permissions.ts`)

| Fonction | Comportement |
|----------|--------------|
| `isDirector()` | `directeur` ou `admin` |
| `isManager()` | `manager` |
| `isHub()` | `hub` |
| `isManagement()` | directeur, admin ou manager |
| `getCityFilter()` | `null` (toutes villes) pour directeur/admin ; filtré par ville pour manager/hub |
| `canCreateRole(creator, target)` | Directeur : manager, cashier, livreur, hub — Manager : cashier, livreur uniquement |
| `canManageStore()` | Directeur : tous — Manager/Hub : même ville que le magasin |
| `canEditStockTotal()` | Directeur ou Hub |
| `STOCK_MANAGEMENT_ROLES` | directeur, admin, manager, hub |

### Comptes caisse spéciaux

| Concept | Description |
|---------|-------------|
| **Compte POS magasin** (`is_store_pos`) | Terminal partagé en magasin ; session opérateur NFC |
| **Caissier personnel** | Si le magasin a un terminal POS, le caissier personnel est en mode planning-only sur mobile |
| **Sessions opérateur** | Tables `pos_operator_sessions`, `cashier_nfc_cards` |

### Création d'utilisateurs

- Actions management : `lib/actions.ts` (`MANAGEMENT = ["directeur", "admin", "manager"]`)
- Comptes hub : créés par le directeur via `components/hub/hub-accounts-manager.tsx`
- Réclamations : visibles uniquement par managers et directeurs (RLS migration `047`)

---

## 3. Routes et pages

### Racine et authentification

| Route | Fichier | Accès |
|-------|---------|-------|
| `/` | `app/page.tsx` | Redirection login ou accueil selon rôle |
| `/login` | `app/login/page.tsx` | Public |

### Caissier — `app/cashier/`

Rôles : `cashier`, `manager`, `directeur`

| Route | Description |
|-------|-------------|
| `/cashier/pos` | Terminal de caisse (POS) |
| `/cashier/planning` | Mon planning / shifts |
| `/cashier/orders` | Commandes Shopify |
| `/cashier/sales` | Historique des ventes |
| `/cashier/customers` | Clients fidélité |
| `/cashier/notes` | Notes clients |
| `/cashier/transfers` | Transferts hub (demandes) |
| `/cashier/returns` | Retours |
| `/cashier/invoices` | Factures |
| `/cashier/invoices/[id]` | Détail facture |
| `/cashier/actualites` | Actualités internes |

### Gérant — `app/manager/`

Rôle : `manager`

| Route | Description |
|-------|-------------|
| `/manager` | Tableau de bord |
| `/manager/orders` | Commandes Shopify |
| `/manager/planning` | Planning équipe |
| `/manager/sales` | Ventes |
| `/manager/stock` | Stock magasin |
| `/manager/products` | Catalogue produits |
| `/manager/stores` | Magasins |
| `/manager/activity` | Journal d'activité |
| `/manager/reclamations` | Réclamations |
| `/manager/loyalty` | Programme fidélité |
| `/manager/loyalty/[id]` | Fiche client fidélité |
| `/manager/loyalty/customers` | Liste clients |
| `/manager/invoices` | Factures |
| `/manager/invoices/[id]` | Détail facture |
| `/manager/actualites` | Actualités |
| `/manager/users` | Utilisateurs magasin |

Accès partagé : `/cashier/pos` (lien dans la navigation gérant)

### Directeur — `app/director/`

Rôles : `directeur`, `admin` — la plupart des pages réexportent les pages manager.

| Route | Description |
|-------|-------------|
| `/director` | Tableau de bord (réexport manager) |
| `/director/hub` | Vue stock globale hub |
| `/director/hubs` | Gestion comptes hub |
| `/director/users` | Utilisateurs (tous magasins) |
| `/director/*` | Miroir de `/manager/*` (orders, stock, loyalty, etc.) |

### Hub logistique — `app/hub/`

Rôle : `hub`

| Route | Description |
|-------|-------------|
| `/hub` | Accueil hub |
| `/hub/stock` | Stock par magasin |
| `/hub/hub-stock` | Entrepôt central — envoi vers magasins |
| `/hub/activity` | Journal d'activité |
| `/hub/actualites` | Actualités |
| `/hub/invoices` | Factures (existe, non listée dans la nav sidebar) |
| `/hub/invoices/[id]` | Détail facture |

### Livreur — `app/livreur/`

Rôle : `livreur`

| Route | Description |
|-------|-------------|
| `/livreur/orders` | Livraisons en cours |
| `/livreur/actualites` | Actualités |
| `/livreur/returns` | Retours |
| `/livreur` | Redirection |

### Pages publiques (sans auth staff)

| Route | Description |
|-------|-------------|
| `/commande/[token]` | Suivi commande Shopify |
| `/carte/[token]` | Carte fidélité client (QR / PWA) |
| `/reclamation` | Formulaire réclamation public |
| `/avis-google` | Page avis Google (FR) |
| `/EN/google-reviews` | Avis Google (EN) |
| `/EN/avis-google` | Alias EN |
| `/produit/[id]` | Fiche produit marketing |

> Les URLs `/en/*` sont redirigées vers `/EN/*` par le middleware.

---

## 4. Fonctionnalités par module

### 4.1 Caisse (POS)

**Fichiers :** `components/pos/`, `lib/pos/`

- Scan code-barres (`lib/hooks/use-barcode-scanner.ts`)
- Paiement espèces / carte
- Terminal POS magasin avec gate NFC opérateur (`PosOperatorGate`)
- Fidélité + codes promo cumulables (`lib/marketing/pos-promo.ts`)
- Encaissement commandes Shopify depuis la caisse
- Annulation vente : règles 24 h caissier / gérant
- Tickets et factures (`pos-invoice.tsx`, `ticket.tsx`)

### 4.2 Fidélité

**Fichiers :** `lib/loyalty/`, `components/loyalty/`

- Carte digitale QR : `/carte/[token]`
- Variantes visuelles : champagne, noir, crème
- Points, paliers, réduction en caisse (seuil configurable)
- Notes client (`customer_notes`) — liaison Shopify / WhatsApp / caisse
- Gestion : `/manager/loyalty`, `/cashier/customers`
- Wallet Apple/Google : placeholders (`lib/loyalty/wallet.ts`)

### 4.3 Shopify (commandes web)

**Fichiers :** `lib/shopify/`

- Sync cron toutes les 5 min + webhook temps réel
- Statuts : `pending`, `preparing`, `ready`, `shipping`, `delivered`, `returned`, `paid`, `cancelled`
- COD (paiement à la livraison), géocodage, assignation magasin/livreur
- Suivi public : `/commande/[token]`
- Retours et restock

### 4.4 WhatsApp (Kapso + Gemini)

**Fichiers :** `lib/kapso/`

| Fonction | Description |
|----------|-------------|
| Confirmation commande | Template WhatsApp à la création |
| Notifications statut | Préparation, expédition, livraison |
| Feedback livraison | Message ~2 h après livraison |
| Win-back | Rappel clients inactifs (cron quotidien) |
| Bot Gemini | Réponses FR/darija, réclamations, avis |
| Notifications caisse | Alertes ventes (Kapso) |

Webhook entrant : `/api/kapso/webhooks/whatsapp`

### 4.5 Hub / Stock

**Fichiers :** `lib/hub-transfers.ts`, `lib/inventory.ts`, `components/hub/`

- Transferts hub → magasins (`hub_stock_transfers`)
- Demandes caissier → hub (`cashier_store_transfers`)
- Vue directeur globale : `/director/hub`
- Journal mouvements : `stock_movements`, activité

### 4.6 Factures

**Fichiers :** `lib/sales/`, `components/invoices/`

- Génération HTML/PDF côté client
- Accès par rôle : caissier, manager, directeur, hub
- Infos société : `lib/constants/company.ts`

### 4.7 Planning

**Fichiers :** `lib/scheduling/`, `components/scheduling/`

- Shifts caissiers (`cashier_shifts`)
- Jours de repos (`cashier_week_offs`)
- Vue mobile dédiée : `cashier-my-schedule-mobile.tsx`
- Gestion manager : `/manager/planning`

### 4.8 Réclamations

**Fichiers :** `lib/feedback/`, `components/feedback/`

- Formulaire public : `/reclamation`
- Gestion staff : `/manager/reclamations`, `/director/reclamations`
- Table : `store_complaints`

### 4.9 Marketing

**Fichiers :** `lib/marketing/`

- Codes promo win-back (validité 24 h)
- Cross-sell post-achat
- Avis Google (`/avis-google`)
- Liens courts (`short_links`)
- Pages produit storytelling (`/produit/[id]`)

### 4.10 Actualités

**Fichiers :** `lib/news/`, `components/news/`

- Annonces internes avec images
- Feed sur tous les rôles staff
- Gestion : managers / directeurs

### 4.11 Journal d'activité

**Fichiers :** `lib/activity.ts`

Types : `stock_add`, `stock_adjustment`, `stock_transfer_in`, `stock_transfer_out`, `sale`

Pages : `/manager/activity`, `/director/activity`, `/hub/activity`

---

## 5. Base de données Supabase

**69 migrations** dans `supabase/migrations/` (001 → 069)

### Tables principales

| Table | Usage |
|-------|-------|
| `profiles` | Utilisateurs staff (lié à `auth.users`) |
| `stores` | Magasins retail + hub |
| `store_inventory` | Stock par magasin |
| `products` | Catalogue (+ variantes) |
| `sales`, `sale_items` | Transactions POS |
| `stock_movements` | Audit stock |
| `customers` | Membres fidélité |
| `loyalty_transactions` | Points gagnés / utilisés |
| `loyalty_settings` | Config programme |
| `customer_notes` | Notes multi-canal |
| `shopify_orders` | Commandes web |
| `store_complaints` | Réclamations |
| `hub_stock_transfers`, `hub_stock_transfer_items` | Logistique hub |
| `hub_manager_assignments` | Liaison hub ↔ gérants |
| `cashier_store_transfers` | Transferts initiés caissier |
| `cashier_shifts`, `cashier_week_offs` | Planning |
| `cashier_nfc_cards`, `pos_operator_sessions` | Terminal POS |
| `whatsapp_bot_sessions` | État bot + historique |
| `winback_promo_codes`, `customer_whatsapp_reviews` | Marketing |
| `short_links` | URLs courtes |
| `news_announcements`, `news_announcement_images` | Actualités |

### Commandes base de données

```bash
npx supabase login
npx supabase link --project-ref agobpjhgkloxgetntcye
npm run db:migrate
```

---

## 6. Variables d'environnement

Copier `.env.local.example` → `.env.local`

### Supabase (requis)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique anon |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service (scripts, admin) |
| `SUPABASE_ACCESS_TOKEN` | Token CLI migrations |
| `SUPABASE_DB_PASSWORD` | Mot de passe DB |

### Application

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | URL publique (localhost, ngrok ou prod) |
| `CRON_SECRET` | Secret Bearer pour `/api/cron/*` |

### Kapso / WhatsApp

| Variable | Description |
|----------|-------------|
| `KAPSO_API_KEY` | Clé API Kapso |
| `KAPSO_PHONE_NUMBER_ID` | ID numéro WhatsApp |
| `KAPSO_TEMPLATE_NAME` | Template confirmation commande |
| `KAPSO_STATUS_TEMPLATE_NAME` | Template statuts |
| `KAPSO_WEBHOOK_SECRET` | Vérification webhook |
| `KAPSO_WHATSAPP_ENABLED` | `false` pour désactiver |
| `KAPSO_BOT_ENABLED` | `false` pour désactiver le bot |
| `KAPSO_SANDBOX_OVERRIDE_TO` | Redirection test (tous messages vers ce numéro) |

### Gemini (bot)

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` ou `GOOGLE_AI_API_KEY` | Clé API |
| `GEMINI_MODEL` | Défaut : `gemini-2.0-flash` |

### Shopify

| Variable | Description |
|----------|-------------|
| `SHOPIFY_SHOP_DOMAIN` | `boutique.myshopify.com` |
| `SHOPIFY_ACCESS_TOKEN` | Token Admin API |
| `SHOPIFY_WEBHOOK_SECRET` | Vérification webhook commandes |

### Wallet (futur)

`APPLE_WALLET_PASS_TYPE_ID`, `APPLE_WALLET_TEAM_ID`, `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_CLASS_ID`

---

## 7. Scripts npm

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur développement |
| `npm run build` | Build production |
| `npm run start` | Serveur production |
| `npm run lint` | ESLint |
| `npm run typecheck` | Vérification TypeScript |
| `npm test` | Tests unitaires |
| `npm run setup` | Setup complet (migrate + seed) |
| `npm run db:migrate` | Appliquer migrations Supabase |
| `npm run seed:users` | Magasins, produits, utilisateurs |
| `npm run seed:orders` | Commandes Shopify de test |
| `npm run seed:marketing-test` | Données marketing WhatsApp |
| `npm run seed:shopify-feedback` | Test avis / réclamations |
| `npm run seed:pos-terminal` | Terminal POS + NFC |
| `npm run seed:loyalty-customer` | Client fidélité test |
| `npm run seed:actualites` | Actualités de démo |
| `npm run reset:orders` | Réinitialiser commandes |
| `npm run reset:demo` / `seed:demo` | Mode démo |
| `npm run upload-images` | Upload images produits |

### Comptes test (seed)

| Email | Mot de passe | Rôle |
|-------|--------------|------|
| `directeur@natus.ma` | `Natus2026!` | Directeur |
| `manager@natus.ma` | `Natus2026!` | Gérant |
| `cashier@natus.ma` | `Natus2026!` | Caissier |
| `caisse.natus.gueliz@natus.ma` | `Natus2026!` | Compte POS magasin |

---

## 8. Architecture du code

```
natus/
├── app/                    # Pages Next.js (App Router)
│   ├── cashier/            # Caisse et opérations magasin
│   ├── manager/            # Gestion magasin
│   ├── director/           # Direction
│   ├── hub/                # Logistique
│   ├── livreur/            # Livraisons
│   ├── api/                # Routes API (crons, webhooks)
│   ├── commande/           # Public — suivi commande
│   ├── carte/              # Public — carte fidélité
│   └── ...
├── components/
│   ├── layout/             # Shell, sidebar, nav mobile
│   ├── pos/                # Terminal caisse
│   ├── loyalty/            # Fidélité
│   ├── orders/             # Commandes Shopify
│   ├── hub/                # Hub logistique
│   ├── scheduling/         # Planning
│   ├── invoices/           # Factures
│   ├── ui/                 # Primitives (Button, Input, Modal…)
│   └── ...
├── lib/
│   ├── actions.ts          # Server actions centralisées
│   ├── auth.ts             # Session, requireRole
│   ├── permissions.ts      # Helpers rôles
│   ├── types.ts            # Types TypeScript partagés
│   ├── supabase/           # Clients Supabase
│   ├── shopify/            # Intégration Shopify
│   ├── kapso/              # WhatsApp + bot
│   ├── loyalty/            # Fidélité
│   ├── marketing/          # Promo, win-back, avis
│   ├── pos/                # Logique caisse
│   ├── scheduling/         # Planning
│   ├── sales/              # Ventes, factures
│   └── layout/             # nav-links, mobile helpers
├── supabase/migrations/    # Schéma SQL (69 fichiers)
├── scripts/                # Seeds, migrations, tests manuels
└── tests/                  # Tests unitaires
```

### Pattern applicatif

1. **Pages** (`app/**/page.tsx`) — Server Components, fetch données
2. **Server actions** — `lib/actions.ts` + actions domaine (`lib/pos/actions.ts`, etc.)
3. **Composants client** — `"use client"` pour interactivité (POS, formulaires)
4. **Sécurité** — RLS Supabase + guards middleware + `requireRole()` côté layout

### Navigation

Source unique : `lib/layout/nav-links.ts`

- Desktop : sidebar (`components/layout/sidebar.tsx`)
- Mobile : barre bas (max 5 liens + menu « Plus ») — `components/layout/mobile-nav.tsx`
- Priorité mobile : champ `mobileOrder` (plus petit = plus visible)

---

## 9. Comportement mobile vs desktop

### Détection

| Couche | Mécanisme | Fichier |
|--------|-----------|---------|
| Serveur | User-Agent | `lib/layout/mobile-request.ts` |
| Client | `matchMedia("(max-width: 767px)")` | `lib/hooks/use-mobile-viewport.ts` |

### Règles d'accès mobile

| Scénario | Mobile | Desktop |
|----------|--------|---------|
| Directeur, gérant, hub sur `/cashier/pos` | Redirigé vers accueil management | Caisse complète |
| Compte POS magasin (`is_store_pos`) | Planning uniquement | Caisse + gate NFC |
| Caissier personnel (magasin avec terminal) | Planning uniquement | Caisse complète |
| Caissier standard | Accès complet | Accès complet |

### Adaptations UI

- **Desktop** : sidebar, padding `md:p-8`
- **Mobile** : top bar + bottom nav, safe-area iOS
- **POS** : plein écran, pas de nav bas sur `/cashier/pos`
- **Planning mobile** : composant dédié `CashierMyScheduleMobile`
- **Session** : déconnexion idle 15 min (`components/auth/session-guard.tsx`) — désactivée sur terminal POS magasin

---

## 10. API et crons

### Routes API (`app/api/`)

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/cron/shopify-sync` | GET | Sync commandes Shopify |
| `/api/cron/delivery-feedback` | GET | Feedback WhatsApp post-livraison |
| `/api/cron/winback` | GET | Campagne win-back |
| `/api/cron/revalidate-cache` | GET | Invalidation cache Next.js |
| `/api/shopify/webhooks/orders` | POST | Webhook commandes Shopify |
| `/api/kapso/webhooks/whatsapp` | POST | Webhook messages WhatsApp |
| `/api/reclamation` | POST | Soumission réclamation publique |
| `/api/loyalty/card/[token]` | GET | API carte fidélité |
| `/api/loyalty/manifest/[token]` | GET | Manifest PWA carte |

Tous les crons exigent : `Authorization: Bearer ${CRON_SECRET}`

### Planification Vercel (`vercel.json`)

| Cron | Fréquence |
|------|-----------|
| `shopify-sync` | Toutes les 5 minutes |
| `delivery-feedback` | Toutes les 15 minutes |
| `winback` | Quotidien 10:00 UTC |
| `revalidate-cache` | Quotidien minuit UTC |

### Webhooks à configurer en production

| Service | URL |
|---------|-----|
| Kapso WhatsApp | `https://<domaine>/api/kapso/webhooks/whatsapp` |
| Shopify commandes | `https://<domaine>/api/shopify/webhooks/orders` |

---

## 11. Design system

### Palette (`app/globals.css`)

| Token | Valeur | Usage |
|-------|--------|-------|
| `--cream` | `#FFF6EC` | Fond chaud |
| `--champagne` | `#FAEAA1` | Accents, boutons secondaires |
| `--primary` | `#B38C4A` | Or Natus — actions, liens |
| `--page` | `#FFFDF9` | Fond page |
| `--sidebar` | `#EBD4BA` | Barre latérale |
| `--danger` | `#B33A3A` | Erreurs, suppressions |
| `--success` | `#4A7C59` | Succès |

### Typographie

- **Corps** : Jost (`--font-jost`)
- **Titres** : Georgia / serif (`--font-serif`)

### Composants CSS

| Classe | Usage |
|--------|-------|
| `.natus-card` | Cartes conteneur |
| `.natus-field` | Champs formulaire |
| `.natus-mobile-bottom-nav` | Navigation mobile (coins arrondis) |
| `.loyalty-wallet-card` | Carte fidélité digitale |

### Composants UI (`components/ui/`)

`Button`, `Input`, `Modal`, `Card`, `Badge`, `SelectMenu`, `FilterTogglePanel`, `Pagination`, `UserAvatar`, etc.

---

## 12. Installation et déploiement

### Installation locale

```bash
git clone https://github.com/fleapouissal-lang/natus-sys.git
cd natus-sys
npm install
cp .env.local.example .env.local
# Renseigner les variables (Supabase, Kapso, Shopify…)
npx supabase login
npm run db:migrate
npm run seed:users
npm run dev
```

Ouvrir http://localhost:3000

### Déploiement Vercel

1. Connecter le repo GitHub à Vercel
2. Configurer toutes les variables d'environnement (section 6)
3. Définir `CRON_SECRET` (obligatoire pour les crons)
4. Exécuter `npm run db:migrate` sur la base Supabase production
5. Configurer les webhooks Kapso et Shopify (section 10)
6. Déployer : push sur `master` déclenche le build

### Headers sécurité (`next.config.ts`)

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Vérifications avant mise en prod

```bash
npm run typecheck
npm run lint
npm run build
npm test
```

---

## Annexes

### Flux métier simplifié

```
Client web (Shopify)
    → Webhook / Cron sync
    → Commande en base (shopify_orders)
    → Notification WhatsApp (Kapso)
    → Préparation magasin / Hub
    → Livraison (livreur)
    → Feedback WhatsApp + fidélité

Vente magasin (POS)
    → Scan produit / recherche
    → Panier + fidélité + promo
    → Paiement
    → Facture + points fidélité
    → Mouvement stock
```

### Liens utiles

- [README.md](./README.md) — guide rapide
- [AGENTS.md](./AGENTS.md) — règles développement Next.js
- `.env.local.example` — template variables

---

*Dernière mise à jour : juin 2026 — 69 migrations, Next.js 16, React 19*
