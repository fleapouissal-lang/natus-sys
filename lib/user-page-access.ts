import { getSettingsPath } from "@/lib/layout/settings-path";
import type { NavLinkItem } from "@/lib/layout/nav-links";
import type { Profile, UserRole } from "@/lib/types";

export type UserPageKey =
  | "dashboard"
  | "planning"
  | "pos"
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
  | "returns"
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
  { key: "sales", label: "Ventes", description: "Historique des ventes POS", group: "operations" },
  { key: "stock", label: "Stock", description: "Vue globale et stock par magasin ou dépôt", group: "operations" },
  { key: "products", label: "Produits", description: "Catalogue et fiches produit", group: "admin" },
  { key: "stores", label: "Magasins", description: "Points de vente et paramètres", group: "admin" },
  { key: "activity", label: "Historique", description: "Historique des actions et mouvements", group: "admin" },
  { key: "reclamations", label: "Réclamations", description: "Suivi des réclamations clients", group: "clients" },
  { key: "loyalty", label: "Clients & Fidélité", description: "Cartes fidélité, clients Pro et programme", group: "clients" },
  { key: "invoices", label: "Factures", description: "Factures et documents de vente", group: "clients" },
  { key: "actualites", label: "Actualités", description: "Annonces et communications internes", group: "admin" },
  { key: "users", label: "Utilisateurs", description: "Gestion des comptes équipe", group: "admin" },
  { key: "hub_stock", label: "Hub stock", description: "Stock entrepôt central", group: "admin" },
  { key: "hubs", label: "Dépôts", description: "Comptes dépôt ville (indépendants des gérants)", group: "admin" },
  { key: "notes", label: "Notes", description: "Notes clients et suivi caisse", group: "clients" },
  { key: "transfers", label: "Hub / transferts", description: "Réceptions et envois hub", group: "operations" },
  { key: "returns", label: "Retours", description: "Retours produits et SAV", group: "clients" },
  { key: "customers", label: "Fidélité caisse", description: "Clients fidélité en magasin", group: "clients" },
];

const ROLE_PAGE_KEYS: Record<UserRole, UserPageKey[]> = {
  directeur: [
    "dashboard", "planning", "pos", "sales", "stock", "products", "stores",
    "activity", "reclamations", "loyalty", "invoices", "actualites", "users",
    "hub_stock", "hubs",
  ],
  admin: [
    "dashboard", "planning", "pos", "sales", "stock", "products", "stores",
    "activity", "reclamations", "loyalty", "invoices", "actualites", "users",
    "hub_stock", "hubs",
  ],
  manager: [
    "dashboard", "planning", "sales", "stock", "products", "stores",
    "activity", "reclamations", "actualites", "users",
  ],
  cashier: [
    "pos", "planning", "actualites", "sales", "notes", "transfers",
    "customers", "returns", "invoices",
  ],
  livreur: ["actualites", "transfers", "returns"],
  hub: ["dashboard", "stock", "hub_stock", "activity", "actualites"],
};

const PAGE_HOME_PRIORITY: UserPageKey[] = [
  "dashboard",
  "pos",
  "planning",
  "sales",
  "stock",
  "products",
  "stores",
  "reclamations",
  "loyalty",
  "invoices",
  "activity",
  "hub_stock",
  "hubs",
  "actualites",
  "users",
  "notes",
  "transfers",
  "customers",
  "returns",
];

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
    case "sales":
      return role === "cashier" ? "/cashier/sales" : base ? `${base}/sales` : null;
    case "stock":
      return base === "/hub" ? "/hub/stock" : base ? `${base}/stock` : null;
    case "products":
      return base ? `${base}/products` : null;
    case "stores":
      return base ? `${base}/stores` : null;
    case "activity":
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
          ? "/hub/hub-stock"
          : null;
    case "hubs":
      return role === "directeur" || role === "admin" ? "/director/hubs" : null;
    case "notes":
      return "/cashier/notes";
    case "transfers":
      return role === "livreur" ? "/livreur/transfers" : "/cashier/transfers";
    case "returns":
      return role === "livreur" ? "/livreur/returns" : "/cashier/returns";
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
    hrefs.push("/director/loyalty");
  }

  if (
    (profile.role === "directeur" || profile.role === "admin") &&
    (keys.includes("stock") || keys.includes("hub_stock"))
  ) {
    hrefs.push("/director/hub");
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
  if (href === "/director/hub" && (role === "directeur" || role === "admin")) {
    return "hub_stock";
  }
  return null;
}

function navLinkPriorityIndex(key: UserPageKey | null): number {
  if (!key) return 500;
  const idx = PAGE_HOME_PRIORITY.indexOf(key);
  return idx >= 0 ? idx : 500;
}

/** Trie les liens sidebar / mobile selon la priorité métier (paramètres en dernier). */
export function sortNavLinksByPriority(links: NavLinkItem[], role: UserRole): NavLinkItem[] {
  const settingsPath = getSettingsPath(role);

  return [...links]
    .map((link, stableIndex) => {
      const isSettings = link.href === settingsPath;
      const pageKey = isSettings ? null : getPageKeyForNavHref(link.href, role);
      const priority = isSettings ? 1000 : navLinkPriorityIndex(pageKey);
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
