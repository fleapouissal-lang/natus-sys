import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  LayoutGrid,
  Package,
  Warehouse,
  Store,
  Users,
  ShoppingCart,
  ClipboardList,
  RotateCcw,
  Boxes,
  Gift,
  BriefcaseBusiness,
  AlertTriangle,
  MessageSquare,
  FileText,
  CalendarClock,
  Newspaper,
  ScrollText,
  Settings,
  KeyRound,
  Landmark,
  ArrowRightLeft,
  Factory,
} from "lucide-react";
import { getManagementBasePath } from "@/lib/permissions";
import { getSettingsPath } from "@/lib/layout/settings-path";
import { filterNavLinksByPages, sortNavLinksByPriority } from "@/lib/user-page-access";
import type { UserRole } from "@/lib/types";

export type NavLinkItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Priorité barre mobile (plus petit = plus important) */
  mobileOrder?: number;
};

export const personalCashierLinks: NavLinkItem[] = [
  { href: "/cashier/planning", label: "Horaires", icon: CalendarClock, mobileOrder: 0 },
];

/** Ordre de repli — le tri final est appliqué par sortNavLinksByPriority. */
export const cashierLinks: NavLinkItem[] = [
  { href: "/cashier/pos", label: "Caisse", icon: ShoppingCart, mobileOrder: 0 },
  { href: "/cashier/stock", label: "Stock", icon: Warehouse, mobileOrder: 1 },
  { href: "/cashier/planning", label: "Horaires", icon: CalendarClock, mobileOrder: 2 },
  {
    href: "/cashier/transfers/received",
    label: "Stocks reçus",
    icon: Boxes,
    mobileOrder: 3,
  },
  {
    href: "/cashier/transfers/sent",
    label: "Stocks envoyés",
    icon: ArrowRightLeft,
    mobileOrder: 4,
  },
  { href: "/cashier/notes", label: "Notes", icon: MessageSquare, mobileOrder: 5 },
  { href: "/cashier/customers", label: "Clients fidélité", icon: Gift, mobileOrder: 6 },
  { href: "/cashier/pro-clients", label: "Clients Pro", icon: BriefcaseBusiness, mobileOrder: 7 },
  { href: "/cashier/returns", label: "Annulations de stock", icon: RotateCcw, mobileOrder: 8 },
  { href: "/cashier/invoices", label: "Factures", icon: FileText, mobileOrder: 9 },
  { href: "/cashier/cheques", label: "Chèques", icon: Landmark, mobileOrder: 10 },
  { href: "/cashier/actualites", label: "Actualités", icon: Newspaper, mobileOrder: 11 },
  { href: "/cashier/history", label: "Historique", icon: ClipboardList, mobileOrder: 12 },
];

export const livreurLinks: NavLinkItem[] = [
  { href: "/livreur/orders", label: "Livraisons", icon: Package, mobileOrder: 0 },
  { href: "/livreur/transfers", label: "Transferts", icon: Boxes, mobileOrder: 1 },
  { href: "/livreur/returns", label: "Retours", icon: RotateCcw, mobileOrder: 2 },
  { href: "/livreur/actualites", label: "Actualités", icon: Newspaper, mobileOrder: 3 },
];

function buildManagementLinks(basePath: "/director" | "/manager" | "/hub"): NavLinkItem[] {
  if (basePath === "/hub") {
    return [
      { href: "/hub", label: "Accueil", icon: LayoutDashboard, mobileOrder: 0 },
      { href: "/hub/stock", label: "Stock des produits", icon: Warehouse, mobileOrder: 1 },
      {
        href: "/hub/stock-transfers",
        label: "Stocks envoyés",
        icon: ArrowRightLeft,
        mobileOrder: 2,
      },
      {
        href: "/hub/stock-transfers/received",
        label: "Stocks reçus",
        icon: Boxes,
        mobileOrder: 3,
      },
      {
        href: "/hub/fabrication-products",
        label: "Stock des fabrications",
        icon: Factory,
        mobileOrder: 4,
      },
      { href: "/hub/writeoffs", label: "Annulations de stock", icon: RotateCcw, mobileOrder: 5 },
      { href: "/hub/actualites", label: "Actus", icon: Newspaper, mobileOrder: 6 },
      { href: "/hub/activity", label: "Historique", icon: ClipboardList, mobileOrder: 7 },
    ];
  }

  if (basePath === "/manager") {
    return [
      { href: "/manager", label: "Accueil", icon: LayoutDashboard, mobileOrder: 0 },
      { href: "/manager/stock", label: "Stock", icon: Warehouse, mobileOrder: 1 },
      { href: "/manager/planning", label: "Planning", icon: CalendarClock, mobileOrder: 2 },
      {
        href: "/manager/stock-transfers",
        label: "Stocks envoyés",
        icon: ArrowRightLeft,
        mobileOrder: 3,
      },
      {
        href: "/manager/stock-transfers/received",
        label: "Stocks reçus",
        icon: Boxes,
        mobileOrder: 4,
      },
      {
        href: "/manager/pos-closures",
        label: "Clôtures caisse",
        icon: ScrollText,
        mobileOrder: 5,
      },
      { href: "/manager/cheques", label: "Chèques", icon: Landmark, mobileOrder: 6 },
      { href: "/manager/invoices", label: "Factures", icon: FileText, mobileOrder: 7 },
      { href: "/manager/writeoffs", label: "Annulations de stock", icon: RotateCcw, mobileOrder: 8 },
      { href: "/manager/reclamations", label: "Réclam.", icon: AlertTriangle, mobileOrder: 9 },
      { href: "/manager/actualites", label: "Actus", icon: Newspaper, mobileOrder: 10 },
      { href: "/manager/history", label: "Historique", icon: ClipboardList, mobileOrder: 11 },
    ];
  }

  return [
    { href: basePath, label: "Accueil", icon: LayoutDashboard, mobileOrder: 0 },
    { href: "/cashier/pos", label: "Caisse", icon: ShoppingCart, mobileOrder: 1 },
    { href: `${basePath}/stock`, label: "Stock", icon: Warehouse, mobileOrder: 2 },
    {
      href: `${basePath}/stock-transfers`,
      label: "Stocks envoyés",
      icon: ArrowRightLeft,
      mobileOrder: 3,
    },
    {
      href: `${basePath}/stock-transfers/received`,
      label: "Stocks reçus",
      icon: Boxes,
      mobileOrder: 4,
    },
    { href: `${basePath}/planning`, label: "Planning", icon: CalendarClock, mobileOrder: 5 },
    {
      href: "/director/pos-closures",
      label: "Clôtures caisse",
      icon: ScrollText,
      mobileOrder: 6,
    },
    { href: `${basePath}/cheques`, label: "Chèques", icon: Landmark, mobileOrder: 7 },
    { href: `${basePath}/products`, label: "Produits", icon: Package, mobileOrder: 9 },
    {
      href: "/director/fabrication-products",
      label: "Fabrication",
      icon: Factory,
      mobileOrder: 10,
    },
    { href: `${basePath}/stores`, label: "Magasins & Dépôts", icon: Store, mobileOrder: 11 },
    {
      href: "/director/clients",
      label: "Clients fidélité",
      icon: Gift,
      mobileOrder: 12,
    },
    {
      href: "/director/pro-clients",
      label: "Clients Pro",
      icon: BriefcaseBusiness,
      mobileOrder: 13,
    },
    { href: `${basePath}/invoices`, label: "Factures", icon: FileText, mobileOrder: 14 },
    { href: `${basePath}/writeoffs`, label: "Annulations de stock", icon: RotateCcw, mobileOrder: 15 },
    { href: `${basePath}/reclamations`, label: "Réclam.", icon: AlertTriangle, mobileOrder: 17 },
    { href: "/director/stock-access", label: "Accès stock", icon: KeyRound, mobileOrder: 18 },
    {
      href: "/director/categories",
      label: "Catégories des produits",
      icon: LayoutGrid,
      mobileOrder: 19,
    },
    { href: `${basePath}/actualites`, label: "Actus", icon: Newspaper, mobileOrder: 20 },
    { href: `${basePath}/users`, label: "Users", icon: Users, mobileOrder: 21 },
    { href: `${basePath}/history`, label: "Historique", icon: ClipboardList, mobileOrder: 22 },
  ];
}

export function getSettingsNavItem(role: UserRole): NavLinkItem {
  return {
    href: getSettingsPath(role),
    label: "Paramètres",
    icon: Settings,
    mobileOrder: 99,
  };
}

export type NavSection = {
  id: string;
  label: string;
  links: NavLinkItem[];
};

/** Menu Directeur regroupé en sections logiques (sidebar desktop). */
function buildDirectorNavSections(role: UserRole): NavSection[] {
  return [
    {
      id: "tableau-de-bord",
      label: "Tableau de bord",
      links: [{ href: "/director", label: "Accueil", icon: LayoutDashboard }],
    },
    {
      id: "ventes",
      label: "Ventes",
      links: [
        { href: "/cashier/pos", label: "Caisse", icon: ShoppingCart },
        { href: "/director/pos-closures", label: "Clôtures caisse", icon: ScrollText },
        { href: "/director/cheques", label: "Chèques", icon: Landmark },
        { href: "/director/invoices", label: "Factures", icon: FileText },
        { href: "/director/reclamations", label: "Réclamations", icon: AlertTriangle },
      ],
    },
    {
      id: "stock",
      label: "Stock",
      links: [
        { href: "/director/stock", label: "Stock", icon: Warehouse },
        { href: "/director/stock-transfers", label: "Stocks envoyés", icon: ArrowRightLeft },
        { href: "/director/stock-transfers/received", label: "Stocks reçus", icon: Boxes },
        { href: "/director/writeoffs", label: "Annulations de stock", icon: RotateCcw },
        { href: "/director/stock-access", label: "Accès stock", icon: KeyRound },
      ],
    },
    {
      id: "catalogue",
      label: "Catalogue",
      links: [
        { href: "/director/products", label: "Produits", icon: Package },
        { href: "/director/categories", label: "Catégories des produits", icon: LayoutGrid },
        { href: "/director/fabrication-products", label: "Fabrication", icon: Factory },
      ],
    },
    {
      id: "clients",
      label: "Clients",
      links: [
        { href: "/director/clients", label: "Clients fidélité", icon: Gift },
        { href: "/director/pro-clients", label: "Clients Pro", icon: BriefcaseBusiness },
      ],
    },
    {
      id: "organisation",
      label: "Organisation",
      links: [
        { href: "/director/planning", label: "Planning", icon: CalendarClock },
        { href: "/director/stores", label: "Magasins & Dépôts", icon: Store },
      ],
    },
    {
      id: "administration",
      label: "Administration",
      links: [
        { href: "/director/users", label: "Users", icon: Users },
        { href: "/director/history", label: "Historique", icon: ClipboardList },
        { href: "/director/actualites", label: "Actus", icon: Newspaper },
        getSettingsNavItem(role),
      ],
    },
  ];
}

/** Menu Gérant regroupé en sections logiques (sidebar desktop). */
function buildManagerNavSections(role: UserRole): NavSection[] {
  return [
    {
      id: "tableau-de-bord",
      label: "Tableau de bord",
      links: [{ href: "/manager", label: "Accueil", icon: LayoutDashboard }],
    },
    {
      id: "stock",
      label: "Stock",
      links: [
        { href: "/manager/stock", label: "Stock", icon: Warehouse },
        { href: "/manager/stock-transfers", label: "Stocks envoyés", icon: ArrowRightLeft },
        { href: "/manager/stock-transfers/received", label: "Stocks reçus", icon: Boxes },
        { href: "/manager/writeoffs", label: "Annulations de stock", icon: RotateCcw },
      ],
    },
    {
      id: "gestion",
      label: "Gestion",
      links: [{ href: "/manager/planning", label: "Planning", icon: CalendarClock }],
    },
    {
      id: "comptabilite",
      label: "Comptabilité",
      links: [
        { href: "/manager/pos-closures", label: "Clôtures caisse", icon: ScrollText },
        { href: "/manager/invoices", label: "Factures", icon: FileText },
        { href: "/manager/cheques", label: "Chèques", icon: Landmark },
      ],
    },
    {
      id: "suivi",
      label: "Suivi",
      links: [
        { href: "/manager/reclamations", label: "Réclamations", icon: AlertTriangle },
        { href: "/manager/history", label: "Historique", icon: ClipboardList },
        { href: "/manager/actualites", label: "Actus", icon: Newspaper },
      ],
    },
    {
      id: "configuration",
      label: "Configuration",
      links: [getSettingsNavItem(role)],
    },
  ];
}

/**
 * Sections de la sidebar desktop (Directeur / Gérant), filtrées selon les
 * pages autorisées. Retourne null pour les rôles non concernés.
 */
export function resolveNavSections(input: {
  role: UserRole;
  allowedPages?: string[] | null;
  accessPreset?: string | null;
  requireManagerCode?: boolean;
}): NavSection[] | null {
  let sections: NavSection[];
  if (input.role === "directeur" || input.role === "admin") {
    sections = buildDirectorNavSections(input.role);
  } else if (input.role === "manager") {
    sections = buildManagerNavSections(input.role);
    if (input.requireManagerCode === false) {
      sections = sections.map((section) => ({
        ...section,
        links: section.links.filter((link) => link.href !== "/manager/pos-closures"),
      }));
    }
  } else {
    return null;
  }

  const pageProfile = {
    role: input.role,
    allowed_pages: input.allowedPages ?? null,
    access_preset: input.accessPreset ?? null,
  };

  const seen = new Set<string>();
  return sections
    .map((section) => ({
      ...section,
      links: filterNavLinksByPages(section.links, pageProfile).filter((link) => {
        if (seen.has(link.href)) return false;
        seen.add(link.href);
        return true;
      }),
    }))
    .filter((section) => section.links.length > 0);
}

export function resolveNavLinks(input: {
  role: UserRole;
  allowedPages?: string[] | null;
  accessPreset?: string | null;
  isStorePos?: boolean;
  isPersonalCashier?: boolean;
  hasPosOperator?: boolean;
  planningOnlyNav?: boolean;
  hideMobilePos?: boolean;
  /**
   * Configuration directeur : code gérant requis pour clôturer.
   * Si false (clôture directe), la page « Clôtures caisse » du gérant est masquée.
   */
  requireManagerCode?: boolean;
}): NavLinkItem[] {
  const basePath = getManagementBasePath(input.role);
  const pageProfile = {
    role: input.role,
    allowed_pages: input.allowedPages ?? null,
    access_preset: input.accessPreset ?? null,
  };

  if (input.role === "livreur") {
    const filtered = filterNavLinksByPages(
      [...livreurLinks, getSettingsNavItem(input.role)],
      pageProfile
    );
    return sortNavLinksByPriority(filtered, input.role);
  }

  if (input.role === "cashier") {
    let links = input.planningOnlyNav
      ? [...personalCashierLinks]
      : [...cashierLinks];
    if (input.planningOnlyNav && input.isStorePos) {
      for (const href of ["/cashier/notes", "/cashier/history"] as const) {
        const extra = cashierLinks.find((link) => link.href === href);
        if (extra) links.push(extra);
      }
    }
    if (!input.isStorePos) {
      links = links.filter((link) => link.href !== "/cashier/notes");
    }
    const filtered = filterNavLinksByPages(
      [...links, getSettingsNavItem(input.role)],
      pageProfile
    );
    return sortNavLinksByPriority(filtered, input.role);
  }

  let links = basePath ? buildManagementLinks(basePath) : cashierLinks;

  if (input.role === "manager" && input.requireManagerCode === false) {
    links = links.filter((link) => link.href !== "/manager/pos-closures");
  }

  if (input.hideMobilePos) {
    links = links.filter((link) => link.href !== "/cashier/pos");
  }

  links = filterNavLinksByPages(links, pageProfile);

  const deduped = [...links, getSettingsNavItem(input.role)].filter(
    (link, index, all) => all.findIndex((item) => item.href === link.href) === index
  );

  return sortNavLinksByPriority(deduped, input.role);
}

export function isNavLinkActive(pathname: string, href: string): boolean {
  if (href === "/manager" || href === "/director" || href === "/hub") {
    return pathname === href;
  }
  if (href === "/director/clients") {
    if (pathname === href) return true;
    if (pathname === "/director/loyalty/customers") return true;
    return pathname.startsWith(`${href}/`);
  }
  if (href === "/director/pro-clients") {
    if (pathname === href) return true;
    return pathname.startsWith(`${href}/`);
  }
  if (href === "/director/loyalty") {
    if (pathname === href) return true;
    if (pathname.startsWith("/director/loyalty/") && !pathname.startsWith("/director/loyalty/customers")) {
      return true;
    }
    return false;
  }
  if (href === "/director/stock") {
    if (pathname === href || pathname.startsWith(`${href}?`)) return true;
    if (pathname === "/director/hub" || pathname.startsWith("/director/hub/")) return true;
    return pathname.startsWith(`${href}/`);
  }
  if (
    href.endsWith("/stock-transfers") ||
    href === "/cashier/transfers"
  ) {
    return pathname === href || pathname.startsWith(`${href}?`);
  }
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

/** Liens principaux visibles dans la barre du bas (max 5) */
export function pickMobileBottomLinks(links: NavLinkItem[], max = 5): NavLinkItem[] {
  if (links.length <= max) return links;
  return [...links]
    .sort((a, b) => (a.mobileOrder ?? 99) - (b.mobileOrder ?? 99))
    .slice(0, max);
}

/** Liens secondaires (menu « Plus ») */
export function pickMobileOverflowLinks(links: NavLinkItem[], primary: NavLinkItem[]): NavLinkItem[] {
  const primaryHrefs = new Set(primary.map((l) => l.href));
  return links.filter((l) => !primaryHrefs.has(l.href));
}
