# Natus POS — Factures, clôture caisse & impression

**Public :** Directeur, gérant, caissier  
**Plateforme :** [https://os.natusmarrakech.com](https://os.natusmarrakech.com)  
**Voir aussi :** [Guide des rôles](./GUIDE_ROLES_CLIENT.md)

---

## Factures client

### Principe

Chaque vente en caisse génère une **facture automatique**. Avant d’être visible en magasin (caissier / gérant), elle doit être **validée par le directeur**.

| État | Signification |
|------|----------------|
| **En attente directeur** | Facture créée, non encore publiée au magasin |
| **Validée** | Imprimable, téléchargeable, visible caissier / gérant / portail client |

### Directeur — valider une facture

1. Menu **Factures** (`/director/invoices`)
2. Ouvrir la facture concernée
3. Vérifier ou corriger le **client** (nom, téléphone, email, ICE)
4. Cliquer **Valider la facture**

Après validation, la facture apparaît chez le caissier et le gérant.

### Imprimer ou télécharger

| Action | Rendu |
|--------|--------|
| **Télécharger** | Fichier HTML aux **couleurs Natus** (crème / or), identique à l’écran |
| **Imprimer** | **Même mise en page**, en **noir et blanc** (économie d’encre) |

Les factures longues (nombreuses lignes) passent sur **plusieurs pages A4** :

- en-tête de colonnes répété sur chaque page ;
- bandeau « Facture N° … » sur les pages suivantes ;
- numérotation **Page 1 / N** en bas de page.

### Caissier / gérant

- **Factures** : consulter les factures **validées** du magasin
- Après une vente : **ticket caisse** immédiat ; **facture** seulement si validée par la direction
- Impression facture : bouton **Imprimer** sur la fiche facture

---

## Clôture de caisse (fin de journée)

### Caissier — clôture du jour

1. Menu latéral **Clôture du jour** (bas de la barre caissier)
2. Contrôler la synthèse : transactions, espèces, TPE, chèque
3. Choisir l’action :

| Document | Format | Usage |
|----------|--------|--------|
| **Ticket clôture** | 80 mm (thermique) | À coller / archiver en caisse |
| **Imprimer ticket** | 80 mm | Même contenu, flux d’impression direct |

Le ticket regroupe les **articles vendus** (désignation, qté, P.U., total) et le **total CA TTC**.

### Gérant / directeur — rapport journalier

1. **Clôtures caisse** (`/manager/pos-closures` ou `/director/pos-closures`)
2. Ouvrir une clôture ou lancer une impression

| Document | Format | Contenu |
|----------|--------|---------|
| **Rapport A4** | A4 portrait | **Toutes les ventes** du jour (détail par transaction) |
| **Ticket** | 80 mm | Synthèse + articles agrégés (comme en caisse) |

Le rapport A4 est paginé professionnellement (en-têtes répétés, total en fin de tableau).

### Téléchargement HTML

Depuis l’historique des clôtures, **Télécharger** produit un fichier HTML du ticket (ouvrable dans le navigateur, imprimable).

---

## Installer l’application (PWA)

Sur la page **login** :

- Un **bandeau jaune** propose d’installer Natus sur l’écran d’accueil (mobile ou ordinateur).
- Sur **iPhone** : Partager → Sur l’écran d’accueil.
- Sur **Chrome / Edge** : bouton **Installer** si le navigateur le propose.

Utile pour les caissiers et gérants qui consultent planning, commandes ou actualités sur téléphone.

---

## Catégories caisse (directeur)

Menu **Catégories caisse** (`/director/categories`) :

- Personnaliser l’**image** affichée sur chaque carte catégorie à la caisse
- Une catégorie n’apparaît à la caisse que si elle contient **au moins 1 produit**
- La suppression d’une catégorie retire aussi ses produits (sauf articles déjà vendus)

---

## Rappels pratiques

### Ouverture

- [ ] Vérifier les factures en attente de validation (directeur)
- [ ] Contrôler stock et commandes du jour

### Fermeture

- [ ] Effectuer la **clôture du jour** en caisse
- [ ] Archiver ticket ou rapport selon procédure magasin
- [ ] Signaler au hub les ruptures constatées

---

*Document client Natus Cosmétiques — Marrakech · juin 2026*
