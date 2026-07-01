import { getSettingsPath } from "@/lib/layout/settings-path";
import type { NavLinkItem } from "@/lib/layout/nav-links";
import type { Profile, UserRole } from "@/lib/types";

export type UserPageKey =
  | "dashboard"
  | "planning"
  | "pos"
  | "pos_closures"
  | "sales"
  | "stock"
  | "products"
  | "stores"
  | "activity"
  | "reclamations"
  | "loyalty"
  | "invoices"
  | "actualites"
  | "users"
  | "hub_stock"
  | "hubs"
  | "notes"
  | "transfers"
  | "orders"
  | "hub_orders"
  | "returns"
  | "writeoffs"
  | "stock_access"
  | "cheques"
  | "customers";

export type UserPageGroup = "operations" | "clients" | "admin";

export type UserPageDefinition = {
  key: UserPageKey;
  label: string;
  description: string;
  group: UserPageGroup;
};

export const USER_PAGE_DEFINITIONS: UserPageDefinition[] = [
  { key: "dashboard", label: "Accueil", description: "Tableau de bord et statistiques", group: "operations" },
  { key: "planning", label: "Planning", description: "Horaires et équipes magasin", group: "operations" },
  { key: "pos", label: "Caisse", description: "Point de vente et encaissement", group: "operations" },
  { key: "pos_closures", label: "Clôtures caisse", description: "Rapports et clôtures journalières", group: "operations" },
  { key: "sales", label: "Ventes", description: "Historique des ventes POS", group: "operations" },
  { key: "stock", label: "Stock", description: "Vue globale et stock par magasin ou dépôt", group: "operations" },
  { key: "products", label: "Produits", description: "Catalogue et fiches produit", group: "admin" },
  { key: "stores", label: "Magasins", description: "Points de vente et paramètres", group: "admin" },
  { key: "activity", label: "Historique", description: "Historique des actions et mouvements", group: "admin" },
  { key: "reclamations", label: "Réclamations", description: "Suivi des réclamations clients", group: "clients" },
  { key: "loyalty", label: "Clients fidélité", description: "Cartes fidélité, clients Pro et programme", group: "clients" },
  { key: "invoices", label: "Factures", description: "Factures et documents de vente", group: "clients" },
  { key: "actualites", label: "Actualités", description: "Annonces et communications internes", group: "admin" },
  { key: "users", label: "Utilisateurs", description: "Gestion des comptes équipe", group: "admin" },
  { key: "hub_stock", label: "Hub stock", description: "Stock entrepôt central", group: "admin" },
  { key: "hubs", label: "Dépôts", description: "Comptes dépôt ville (indépendants des gérants)", group: "admin" },
  { key: "notes", label: "Notes", description: "Notes clients et suivi caisse", group: "clients" },
  { key: "transfers", label: "Transferts", description: "Commandes envoyées et reçues (hub et magasins)", group: "operations" },
  { key: "orders", label: "Mes commandes", description: "Transferts en cours de préparation (statut En cours)", group: "operations" },
  { key: "hub_orders", label: "Commandes dépôt", description: "Commandes entrepôt vers magasins", group: "operations" },
  { key: "returns", label: "Retours", description: "Retours produits et SAV", group: "clients" },
  { key: "writeoffs", label: "Retour en stock", description: "Validation retours périmés ou cassés", group: "operations" },
  { key: "stock_access", label: "Accès stock", description: "Demandes d'accès modification stock", group: "operations" },
  { key: "cheques", label: "Chèques", description: "Paiements par chèque en caisse", group: "operations" },
  { key: "customers", label: "Clients fidélité", description: "Clients fidélité en magasin", group: "clients" },
];

const ROLE_PAGE_KEYS: Record<UserRole, UserPageKey[]> = {
  directeur: [
    "dashboard", "planning", "pos", "pos_closures", "sales", "orders", "stock", "products",
    "stores", "transfers", "hub_orders",
    "activity", "reclamations", "loyalty", "invoices", "actualites", "users",
    "hub_stock", "hubs", "writeoffs", "stock_access", "cheques",
  ],
  admin: [
    "dashboard", "planning", "pos", "pos_closures", "sales", "orders", "stock", "products",
    "stores", "transfers", "hub_orders",
    "activity", "reclamations", "loyalty", "invoices", "actualites", "users",
    "hub_stock", "hubs", "writeoffs", "stock_access", "cheques",
  ],
  manager: [
    "dashboard", "planning", "pos_closures", "sales", "orders", "stock", "transfers", "hub_orders",
    "activity", "reclamations", "loyalty", "writeoffs", "invoices", "actualites", "cheques",
  ],
  cashier: [
    "pos", "orders", "planning", "pos_closures", "actualites", "sales", "notes", "transfers",
    "customers", "returns", "invoices", "cheques", "stock",
  ],
  livreur: ["actualites", "orders", "transfers", "returns"],
  hub: [
    "dashboard",
    "orders",
    "stock",
    "hub_stock",
    "transfers",
    "hub_orders",
    "activity",
    "actualites",
    "writeoffs",
  ],
};

/** Ordre sidebar directeur / admin : opérations → clients → admin → secondaire → historique */
const DIRECTOR_NAV_PRIORITY: UserPageKey[] = [
  "dashboard",
  "pos",
  "orders",
  "stock",
  "transfers",
  "hub_orders",
  "planning",
  "pos_closures",
  "cheques",
  "sales",
  "loyalty",
  "invoices",
  "writeoffs",
  "reclamations",
  "products",
  "stores",
  "hubs",
  "stock_access",
  "actualites",
  "users",
  "activity",
];

/**
 * Ordre sidebar gérant par priorité :
 * Accueil → Stock → Stocks envoyés → Stocks reçus → Planning → Clôtures →
 * Factures → Chèques → Retour en stock → Réclamations → Actualités →
 * Historique (forcé avant Paramètres).
 */
const MANAGER_NAV_PRIORITY: UserPageKey[] = [
  "dashboard",    // Accueil
  "orders",       // Mes commandes
  "stock",        // Stock
  "transfers",    // Stocks envoyés
  "hub_orders",   // Stocks reçus
  "planning",     // Planning
  "pos_closures", // Clôtures de caisse
  "invoices",     // Factures
  "cheques",      // Chèques
  "writeoffs",    // Retour en stock
  "reclamations", // Réclamations
  "loyalty",      // Clients Pro
  "actualites",   // Actualités
  "activity",     // Historique — replacé en pénultième via HISTORY_NAV_PRIORITY
];

/** Ordre sidebar hub : stock & transferts → opérations → secondaire → historique */
const HUB_NAV_PRIORITY: UserPageKey[] = [
  "dashboard",
  "orders",
  "stock",
  "transfers",
  "hub_orders",
  "writeoffs",
  "actualites",
  "activity",
];

/**
 * Ordre sidebar caissier par priorité d'utilisation :
 * Caisse → Stock → Stocks reçus → Stocks envoyés → Retour en stock → Factures →
 * Clients fidélité → Clients Pro → Chèques → Horaires → Notes → Actualités →
 * Historique (forcé avant Paramètres).
 */
const CASHIER_NAV_PRIORITY: UserPageKey[] = [
  "pos",          // Caisse
  "orders",       // Mes commandes
  "stock",        // Stock
  "hub_orders",   // Stocks reçus
  "transfers",    // Stocks envoyés
  "returns",      // Retour en stock (caissier)
  "invoices",     // Factures
  "customers",    // Clients fidélité puis Clients Pro (départage par ordre des liens)
  "cheques",      // Chèques
  "planning",     // Horaires
  "notes",        // Notes
  "actualites",   // Actualités
  "pos_closures",
  "sales",        // Historique — replacé en pénultième via HISTORY_NAV_PRIORITY
];

/** Ordre sidebar livreur : livraisons → transferts → secondaire */
const LIVREUR_NAV_PRIORITY: UserPageKey[] = [
  "orders",
  "transfers",
  "returns",
  "actualites",
];

const PAGE_HOME_PRIORITY: UserPageKey[] = DIRECTOR_NAV_PRIORITY;

const PAGE_GROUP_LABELS: Record<UserPageGroup, string> = {
  operations: "Opérations magasin",
  clients: "Clients & suivi",
  admin: "Gestion & administration",
};

function managementBase(role: UserRole): "/director" | "/manager" | "/hub" | null {
  if (role === "directeur" || role === "admin") return "/director";
  if (role === "manager") return "/manager";
  if (role === "hub") return "/hub";
  return null;
}

export function getDefaultPageKeysForRole(role: UserRole): UserPageKey[] {
  return [...ROLE_PAGE_KEYS[role]];
}

export function getPageDefinitionsForRole(role: UserRole): UserPageDefinition[] {
  const keys = new Set(getDefaultPageKeysForRole(role));
  return USER_PAGE_DEFINITIONS.filter((page) => keys.has(page.key));
}

export function getGroupedPageDefinitionsForRole(role: UserRole) {
  const pages = getPageDefinitionsForRole(role);
  return (Object.keys(PAGE_GROUP_LABELS) as UserPageGroup[]).map((group) => ({
    group,
    label: PAGE_GROUP_LABELS[group],
    pages: pages.filter((page) => page.group === group),
  })).filter((section) => section.pages.length > 0);
}

export function resolvePageHref(key: UserPageKey, role: UserRole): string | null {
  const base = managementBase(role);

  switch (key) {
    case "dashboard":
      return base;
    case "planning":
      return role === "cashier" || role === "livreur"
        ? "/cashier/planning"
        : base
          ? `${base}/planning`
          : null;
    case "pos":
      if (role === "hub") return null;
      return "/cashier/pos";
    case "pos_closures":
      if (role === "cashier") return "/cashier/history";
      if (role === "manager") return "/manager/pos-closures";
      if (role === "directeur" || role === "admin") return "/director/pos-closures";
      return null;
    case "sales":
      if (role === "cashier") return "/cashier/history";
      if (role === "manager") return "/manager/history";
      return base ? `${base}/sales` : null;
    case "stock":
      if (role === "cashier") return "/cashier/stock";
      return base === "/hub" ? "/hub/stock" : base ? `${base}/stock` : null;
    case "products":
      return base ? `${base}/products` : null;
    case "stores":
      return base ? `${base}/stores` : null;
    case "activity":
      if (role === "manager") return "/manager/history";
      if (role === "directeur" || role === "admin") return "/director/history";
      return base === "/hub" ? "/hub/activity" : base ? `${base}/activity` : null;
    case "reclamations":
      return base ? `${base}/reclamations` : null;
    case "loyalty":
      if (role === "directeur" || role === "admin") return "/director/clients";
      return base ? `${base}/loyalty` : null;
    case "invoices":
      return role === "cashier" ? "/cashier/invoices" : base ? `${base}/invoices` : null;
    case "actualites":
      if (role === "cashier") return "/cashier/actualites";
      if (role === "livreur") return "/livreur/actualites";
      return base ? `${base}/actualites` : null;
    case "users":
      return base ? `${base}/users` : null;
    case "hub_stock":
      return role === "directeur" || role === "admin"
        ? "/director/stock"
        : base === "/hub"
          ? "/hub/stock-transfers"
          : null;
    case "hubs":
      return role === "directeur" || role === "admin" ? "/director/stores" : null;
    case "notes":
      return "/cashier/notes";
    case "transfers":
      if (role === "livreur") return "/livreur/orders";
      if (role === "cashier") return "/cashier/transfers/received";
      if (role === "manager") return "/manager/stock-transfers";
      if (role === "hub") return "/hub/stock-transfers";
      if (role === "directeur" || role === "admin") return "/director/stock-transfers";
      return null;
    case "orders":
      if (role === "livreur") return "/livreur/orders";
      if (role === "cashier") return "/cashier/orders";
      if (role === "manager") return "/manager/orders";
      if (role === "directeur" || role === "admin") return "/director/orders";
      if (role === "hub") return "/hub/orders";
      return null;
    case "hub_orders":
      if (role === "hub") return "/hub/stock-transfers/received";
      if (role === "manager") return "/manager/stock-transfers/received";
      if (role === "directeur" || role === "admin") return "/director/stock-transfers/received";
      return null;
    case "returns":
      return role === "livreur" ? "/livreur/orders" : "/cashier/returns";
    case "writeoffs":
      return base ? `${base}/writeoffs` : null;
    case "stock_access":
      return base === "/director" ? "/director/stock-access" : null;
    case "cheques":
      if (role === "cashier") return "/cashier/cheques";
      if (role === "manager") return "/manager/cheques";
      if (role === "directeur" || role === "admin") return "/director/cheques";
      return null;
    case "customers":
      return "/cashier/customers";
    default:
      return null;
  }
}

function legacyPresetPages(preset: string | null | undefined): UserPageKey[] | null {
  if (preset === "store_planning_stock") return ["planning", "stock"];
  if (preset === "store_planning_pos_sales") return ["planning", "pos", "sales"];
  return null;
}

export function resolveEffectivePageKeys(
  profile: Pick<Profile, "role" | "allowed_pages" | "access_preset">
): UserPageKey[] | null {
  if (profile.allowed_pages?.length) {
    const allowed = new Set(getDefaultPageKeysForRole(profile.role));
    const filtered = profile.allowed_pages.filter((key): key is UserPageKey =>
      allowed.has(key as UserPageKey)
    );
    return filtered.length > 0 ? filtered : null;
  }

  return legacyPresetPages(profile.access_preset);
}

export function hasCustomPageAccess(
  profile: Pick<Profile, "role" | "allowed_pages" | "access_preset">
): boolean {
  return resolveEffectivePageKeys(profile) !== null;
}

export function getAllowedHrefsForProfile(
  profile: Pick<Profile, "role" | "allowed_pages" | "access_preset">
): string[] | null {
  const keys = resolveEffectivePageKeys(profile);
  if (!keys) return null;

  const hrefs = keys
    .map((key) => resolvePageHref(key, profile.role))
    .filter((href): href is string => Boolean(href));

  if (
    (profile.role === "directeur" || profile.role === "admin") &&
    keys.includes("loyalty")
  ) {
    hrefs.push("/director/loyalty", "/director/pro-clients");
  }

  if (profile.role === "cashier" && keys.includes("customers")) {
    hrefs.push("/cashier/pro-clients");
  }

  if (profile.role === "cashier" && keys.includes("transfers")) {
    hrefs.push("/cashier/transfers/sent", "/cashier/transfers/received", "/cashier/transfers");
  }

  if (profile.role === "manager") {
    if (keys.includes("stock") || keys.includes("transfers") || keys.includes("hub_orders")) {
      hrefs.push("/manager/stock-transfers", "/manager/stock-transfers/received");
    }
    if (keys.includes("hub_orders")) {
      hrefs.push("/manager/hub-orders");
    }
    if (keys.includes("pos_closures")) {
      hrefs.push("/manager/history");
    }
    if (keys.includes("loyalty")) {
      hrefs.push("/manager/pro-clients", "/manager/loyalty");
    }
  }

  if (profile.role === "hub") {
    if (keys.includes("transfers") || keys.includes("hub_orders")) {
      hrefs.push("/hub/stock-transfers", "/hub/stock-transfers/received");
    }
  }

  if (
    (profile.role === "directeur" || profile.role === "admin") &&
    (keys.includes("transfers") || keys.includes("hub_orders"))
  ) {
    hrefs.push("/director/stock-transfers", "/director/stock-transfers/received");
  }

  if (
    (profile.role === "directeur" || profile.role === "admin") &&
    (keys.includes("stock") || keys.includes("hub_stock"))
  ) {
    hrefs.push("/director/hub");
  }

  if (
    (profile.role === "directeur" || profile.role === "admin") &&
    (keys.includes("sales") || keys.includes("pos_closures"))
  ) {
    hrefs.push("/director/history");
  }

  hrefs.push(getSettingsPath(profile.role));
  return [...new Set(hrefs)];
}

function pathAllowed(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isRouteAllowedForProfile(
  pathname: string,
  profile: Pick<Profile, "role" | "allowed_pages" | "access_preset">
): boolean {
  const allowed = getAllowedHrefsForProfile(profile);
  if (!allowed) return true;

  if (profile.role === "cashier") {
    if (
      pathname === "/cashier/sales" ||
      pathname.startsWith("/cashier/sales/") ||
      pathname === "/cashier/pos-closures" ||
      pathname.startsWith("/cashier/pos-closures/")
    ) {
      return pathAllowed("/cashier/history", allowed);
    }
  }

  if (profile.role === "manager") {
    if (
      pathname === "/manager/activity" ||
      pathname.startsWith("/manager/activity/") ||
      pathname === "/manager/sales" ||
      pathname.startsWith("/manager/sales/")
    ) {
      return pathAllowed("/manager/history", allowed);
    }
  }

  if (profile.role === "directeur" || profile.role === "admin") {
    if (
      pathname === "/director/activity" ||
      pathname.startsWith("/director/activity/") ||
      pathname === "/director/sales" ||
      pathname.startsWith("/director/sales/")
    ) {
      return pathAllowed("/director/history", allowed);
    }
  }

  return pathAllowed(pathname, allowed);
}

export function filterNavLinksByPages(
  links: NavLinkItem[],
  profile: Pick<Profile, "role" | "allowed_pages" | "access_preset">
): NavLinkItem[] {
  const allowed = getAllowedHrefsForProfile(profile);
  if (!allowed) return links;
  const set = new Set(allowed);
  return links.filter((link) => set.has(link.href));
}

/** Clé de page associée à un lien sidebar (pour tri par priorité). */
export function getPageKeyForNavHref(href: string, role: UserRole): UserPageKey | null {
  for (const key of getDefaultPageKeysForRole(role)) {
    if (resolvePageHref(key, role) === href) return key;
  }
  if (href === "/director/loyalty" && (role === "directeur" || role === "admin")) {
    return "loyalty";
  }
  if (href === "/director/pro-clients" && (role === "directeur" || role === "admin")) {
    return "loyalty";
  }
  if (href === "/manager/pro-clients" && role === "manager") {
    return "loyalty";
  }
  if (href === "/cashier/pro-clients" && role === "cashier") {
    return "customers";
  }
  if (href === "/director/hub" && (role === "directeur" || role === "admin")) {
    return "hub_stock";
  }
  if (href === "/cashier/history" && role === "cashier") {
    return "sales";
  }
  if (href === "/manager/history" && role === "manager") {
    return "activity";
  }
  if (href === "/manager/pos-closures" && role === "manager") {
    return "pos_closures";
  }
  if (href === "/director/pos-closures" && (role === "directeur" || role === "admin")) {
    return "pos_closures";
  }
  if (
    (href === "/cashier/transfers/sent" || href === "/cashier/transfers/received") &&
    role === "cashier"
  ) {
    return href.endsWith("/received") ? "hub_orders" : "transfers";
  }
  if (href === "/manager/stock-transfers" && role === "manager") {
    return "transfers";
  }
  if (href === "/director/stock-transfers" && (role === "directeur" || role === "admin")) {
    return "transfers";
  }
  if (href === "/manager/stock-transfers/received" && role === "manager") {
    return "hub_orders";
  }
  if (
    href === "/director/stock-transfers/received" &&
    (role === "directeur" || role === "admin")
  ) {
    return "hub_orders";
  }
  if (href === "/director/categories" && (role === "directeur" || role === "admin")) {
    return "products";
  }
  if (href === "/director/stock-access" && (role === "directeur" || role === "admin")) {
    return "stock_access";
  }
  if (href === "/hub/stock-transfers" && role === "hub") {
    return "transfers";
  }
  if (href === "/hub/stock-transfers/received" && role === "hub") {
    return "hub_orders";
  }
  if (href === "/cashier/orders" && role === "cashier") {
    return "orders";
  }
  if (href === "/manager/orders" && role === "manager") {
    return "orders";
  }
  if (href === "/director/orders" && (role === "directeur" || role === "admin")) {
    return "orders";
  }
  if (href === "/hub/orders" && role === "hub") {
    return "orders";
  }
  if (href === "/livreur/orders" && role === "livreur") {
    return "orders";
  }
  return null;
}

function navLinkPriorityIndex(key: UserPageKey | null, role: UserRole): number {
  if (!key) return 500;
  const order =
    role === "manager"
      ? MANAGER_NAV_PRIORITY
      : role === "hub"
        ? HUB_NAV_PRIORITY
        : role === "cashier"
          ? CASHIER_NAV_PRIORITY
          : role === "livreur"
            ? LIVREUR_NAV_PRIORITY
            : role === "directeur" || role === "admin"
              ? DIRECTOR_NAV_PRIORITY
              : PAGE_HOME_PRIORITY;
  const idx = order.indexOf(key);
  return idx >= 0 ? idx : 500;
}

const SETTINGS_NAV_PRIORITY = 10_000;
const HISTORY_NAV_PRIORITY = 9_000;

function isHistoryNavLink(
  href: string,
  role: UserRole,
  pageKey: UserPageKey | null
): boolean {
  if (pageKey === "activity") return true;
  return role === "cashier" && pageKey === "sales" && href === "/cashier/history";
}

/** Trie les liens sidebar / mobile selon la priorité métier (historique avant paramètres). */
export function sortNavLinksByPriority(links: NavLinkItem[], role: UserRole): NavLinkItem[] {
  const settingsPath = getSettingsPath(role);

  return [...links]
    .map((link, stableIndex) => {
      const isSettings = link.href === settingsPath;
      const pageKey = isSettings ? null : getPageKeyForNavHref(link.href, role);
      const priority = isSettings
        ? SETTINGS_NAV_PRIORITY
        : isHistoryNavLink(link.href, role, pageKey)
          ? HISTORY_NAV_PRIORITY
          : navLinkPriorityIndex(pageKey, role);
      return {
        link: {
          ...link,
          mobileOrder: isSettings ? 99 : priority,
        },
        priority,
        stableIndex,
      };
    })
    .sort((a, b) => a.priority - b.priority || a.stableIndex - b.stableIndex)
    .map(({ link }) => link);
}

export function getCustomHomePath(
  profile: Pick<Profile, "role" | "allowed_pages" | "access_preset" | "store_id">
): string | null {
  const keys = resolveEffectivePageKeys(profile);
  if (!keys) return null;

  const sorted = PAGE_HOME_PRIORITY.filter((key) => keys.includes(key));
  const first = sorted[0];
  if (!first) return null;

  const href = resolvePageHref(first, profile.role);
  if (!href) return null;

  if (
    profile.role === "manager" &&
    profile.store_id &&
    (first === "planning" || first === "stock" || first === "dashboard")
  ) {
    return `${href}?store=${profile.store_id}`;
  }

  return href;
}

export function isStoreScopedManager(
  profile: Pick<Profile, "role" | "store_id">
): boolean {
  return profile.role === "manager" && Boolean(profile.store_id);
}

export function parseAllowedPagesInput(raw: FormDataEntryValue | null): UserPageKey[] | null {
  if (!raw || typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((item): item is UserPageKey => typeof item === "string");
  } catch {
    return null;
  }
}

export function validateAllowedPagesForRole(
  role: UserRole,
  pages: UserPageKey[] | null
): UserPageKey[] | null {
  if (!pages || pages.length === 0) return null;
  const allowed = new Set(getDefaultPageKeysForRole(role));
  const filtered = [...new Set(pages.filter((key) => allowed.has(key)))];
  const defaults = getDefaultPageKeysForRole(role);
  if (filtered.length === defaults.length) return null;
  return filtered.length > 0 ? filtered : null;
}

export function summarizePageAccess(
  profile: Pick<Profile, "role" | "allowed_pages" | "access_preset">
): string {
  const keys = resolveEffectivePageKeys(profile);
  if (!keys) return "Accès complet";

  const labels = keys
    .map((key) => USER_PAGE_DEFINITIONS.find((page) => page.key === key)?.label || key)
    .slice(0, 4);

  const suffix = keys.length > 4 ? ` +${keys.length - 4}` : "";
  return `${keys.length} page${keys.length > 1 ? "s" : ""} · ${labels.join(", ")}${suffix}`;
}
