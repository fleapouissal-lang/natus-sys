# Natus POS — Application de caisse cosmétiques

Application de point de vente (POS) moderne pour un magasin de cosmétiques, construite avec **Next.js 16** et **Supabase**.

## Fonctionnalités

### Authentification
- Connexion par email et mot de passe
- Gestion des rôles via Supabase (Row Level Security)
- Deux rôles : **Gérant** (manager) et **Caissier** (cashier)

### Gérant (Manager)
- Ajouter / modifier / supprimer des produits
- Gérer le stock et les alertes de rupture
- Consulter toutes les ventes
- Tableau de bord avec statistiques
- Gérer les utilisateurs (création, rôles, activation)

### Caissier (Cashier)
- Interface de caisse dédiée
- Scanner des codes-barres ou recherche manuelle
- Effectuer des ventes avec gestion du panier
- Consulter l'historique de ses ventes

## Installation

### 1. Cloner et installer

```bash
npm install
```

### 2. Configurer Supabase

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Copiez `.env.local.example` vers `.env.local` :

```bash
cp .env.local.example .env.local
```

3. Renseignez vos clés Supabase dans `.env.local` :

```
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-clé-anon
```

4. Exécutez le script SQL dans l'éditeur SQL Supabase :

```
supabase/migrations/001_initial_schema.sql
```

### 3. Créer le premier utilisateur gérant

Dans le dashboard Supabase → Authentication → Users → Add user, créez un utilisateur avec :

- Email et mot de passe
- User Metadata : `{ "role": "manager", "full_name": "Admin" }`

Le trigger SQL créera automatiquement le profil avec le rôle gérant.

### 4. Lancer l'application

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

## Structure

```
app/
├── login/              # Page de connexion
├── manager/            # Espace gérant
│   ├── products/       # Gestion produits
│   ├── stock/          # Gestion stock
│   ├── sales/          # Historique ventes
│   └── users/          # Gestion utilisateurs
└── cashier/
    ├── pos/            # Interface caisse
    └── sales/          # Historique caissier

components/
├── auth/               # Formulaire connexion
├── layout/             # Sidebar navigation
├── pos/                # Terminal de caisse
├── products/           # Gestion produits
├── stock/              # Gestion stock
├── users/              # Gestion utilisateurs
└── ui/                 # Composants UI

lib/
├── actions.ts          # Server Actions
├── auth.ts             # Helpers authentification
├── types.ts            # Types TypeScript
└── supabase/           # Clients Supabase

supabase/
└── migrations/         # Schéma base de données
```

## Technologies

- **Next.js 16** — App Router, Server Actions, Middleware
- **Supabase** — Auth, PostgreSQL, Row Level Security
- **Tailwind CSS 4** — Design system cosmétiques (rose/doré)
- **TypeScript** — Typage strict
- **Lucide React** — Icônes
