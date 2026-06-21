# Natus POS — Marrakech

Application de caisse, fidélité, commandes Shopify et marketing WhatsApp pour **Natus Cosmétiques** (Guéliz, Médina, hub logistique).

## Stack

- **Next.js 16** (App Router)
- **Supabase** (auth, PostgreSQL, RLS)
- **Kapso** + **Gemini** (WhatsApp bot, notifications)
- **Shopify** (commandes web)

## Rôles

| Rôle | Accès |
|------|--------|
| `cashier` | Caisse, ventes, clients fidélité |
| `manager` | Magasin(s) ville, stock, ventes, réclamations |
| `directeur` | Tous magasins, utilisateurs, paramètres fidélité |
| `hub` | Transferts inter-magasins |
| `livreur` | Livraisons Shopify |

## Installation

```bash
npm install
cp .env.local.example .env.local
# Renseigner les clés Supabase, Kapso, etc.
npm run db:migrate
npm run seed:users
npm run dev
```

Comptes test (seed) : `manager@natus.ma` / `cashier@natus.ma` / `directeur@natus.ma` → `Natus2026!`

## Scripts utiles

| Commande | Description |
|----------|-------------|
| `npm run db:migrate` | Appliquer les migrations Supabase |
| `npm run seed:users` | Magasins, produits, utilisateurs |
| `npm run seed:marketing-test` | Jeu de test marketing WhatsApp |
| `npm run seed:shopify-feedback` | Test avis / réclamations |
| `npm test` | Tests unitaires (promo, checkout) |
| `npm run typecheck` | Vérification TypeScript |

## Structure

```
app/
├── cashier/          # Caisse POS, ventes
├── manager/          # Gérant magasin
├── director/         # Direction
├── hub/              # Logistique
├── livreur/          # Livraisons
├── commande/         # Suivi commande Shopify (public)
├── carte/            # Carte fidélité client (public)
├── avis-google/      # Avis Google (public)
├── api/cron/         # Win-back, feedback livraison, sync Shopify, vidage cache
lib/
├── kapso/            # WhatsApp bot, notifications
├── marketing/        # Promo, win-back, cross-sell, avis
├── loyalty/          # Fidélité
supabase/migrations/  # Schéma SQL (52+ migrations)
```

## Fonctionnalités principales

- **Caisse** : scan code-barres, fidélité + code promo cumulables, annulation vente (24 h caissier / gérant)
- **Fidélité** : carte QR, points, réduction en caisse
- **Shopify** : commandes web, validation caisse, livraison, retours
- **WhatsApp** : confirmation commande, statuts, avis 2 h après livraison, bot Gemini
- **Marketing** : win-back 60 j (code unique 24 h), cross-sell, avis Google CTA

## Déploiement (Vercel)

1. Variables d'environnement (voir `.env.local.example`)
2. `CRON_SECRET` pour les crons `/api/cron/*`
3. `npm run db:migrate` sur la base Supabase prod
4. Webhook Kapso → `https://votre-domaine/api/kapso/webhooks/whatsapp`
