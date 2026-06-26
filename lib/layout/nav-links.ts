import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Store,
  Receipt,
  Users,
  ShoppingCart,
  History,
  ClipboardList,
  RotateCcw,
  Boxes,
  Gift,
  AlertTriangle,
  MessageSquare,
  FileText,
  CalendarClock,
  Newspaper,
  Settings,
} from "lucide-react";
import { getManagementBasePath } from "@/lib/permissions";
import { getSettingsPath } from "@/lib/layout/settings-path";
import { filterNavLinksByPages } from "@/lib/user-page-access";
import type { UserRole } from "@/lib/types";

export type NavLinkItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Priorité barre mobile (plus petit = plus important) */
  mobileOrder?: number;
};

export const personalCashierLinks: NavLinkItem[] = [
  { href: "/cashier/planning", label: "Planning", icon: CalendarClock, mobileOrder: 0 },
];

export const cashierLinks: NavLinkItem[] = [
  { href: "/cashier/pos", label: "Caisse", icon: ShoppingCart, mobileOrder: 0 },
  { href: "/cashier/planning", label: "Planning", icon: CalendarClock, mobileOrder: 1 },
  { href: "/cashier/actualites", label: "Actualités", icon: Newspaper, mobileOrder: 2 },
  { href: "/cashier/sales", label: "Ventes", icon: History, mobileOrder: 3 },
  { href: "/cashier/notes", label: "Notes", icon: MessageSquare, mobileOrder: 4 },
  { href: "/cashier/transfers", label: "Hub", icon: Boxes, mobileOrder: 5 },
  { href: "/cashier/customers", label: "Fidélité", icon: Gift, mobileOrder: 6 },
  { href: "/cashier/returns", label: "Retours", icon: RotateCcw, mobileOrder: 7 },
  { href: "/cashier/invoices", label: "Factures", icon: FileText, mobileOrder: 8 },
];

export const livreurLinks: NavLinkItem[] = [
  { href: "/livreur/actualites", label: "Actualités", icon: Newspaper, mobileOrder: 0 },
  { href: "/livreur/returns", label: "Retours", icon: RotateCcw, mobileOrder: 1 },
];

function buildManagementLinks(basePath: "/director" | "/manager" | "/hub"): NavLinkItem[] {
  if (basePath === "/hub") {
    return [
      { href: "/hub", label: "Accueil", icon: LayoutDashboard, mobileOrder: 0 },
      { href: "/cashier/pos", label: "Caisse", icon: ShoppingCart, mobileOrder: 1 },
      { href: "/hub/stock", label: "Stock", icon: Warehouse, mobileOrder: 2 },
      { href: "/hub/hub-stock", label: "Entrepôt", icon: Boxes, mobileOrder: 3 },
      { href: "/hub/activity", label: "Activité", icon: ClipboardList, mobileOrder: 4 },
      { href: "/hub/actualites", label: "Actus", icon: Newspaper, mobileOrder: 5 },
    ];
  }

  const links: NavLinkItem[] = [
    { href: basePath, label: "Accueil", icon: LayoutDashboard, mobileOrder: 0 },
    { href: `${basePath}/planning`, label: "Planning", icon: CalendarClock, mobileOrder: 1 },
  ];

  if (basePath === "/director") {
    links.push({
      href: "/cashier/pos",
      label: "Caisse",
      icon: ShoppingCart,
      mobileOrder: 2,
    });
  }

  links.push(
    { href: `${basePath}/sales`, label: "Ventes", icon: Receipt, mobileOrder: 3 },
    { href: `${basePath}/stock`, label: "Stock", icon: Warehouse, mobileOrder: 4 },
    { href: `${basePath}/products`, label: "Produits", icon: Package, mobileOrder: 5 },
    { href: `${basePath}/stores`, label: "Magasins", icon: Store, mobileOrder: 6 },
    { href: `${basePath}/activity`, label: "Activité", icon: ClipboardList, mobileOrder: 7 },
    { href: `${basePath}/reclamations`, label: "Réclam.", icon: AlertTriangle, mobileOrder: 8 }
  );

  if (basePath !== "/manager") {
    links.push(
      { href: `${basePath}/loyalty`, label: "Fidélité", icon: Gift, mobileOrder: 9 },
      { href: `${basePath}/invoices`, label: "Factures", icon: FileText, mobileOrder: 10 }
    );
  }

  links.push(
    { href: `${basePath}/actualites`, label: "Actus", icon: Newspaper, mobileOrder: 11 },
    { href: `${basePath}/users`, label: "Users", icon: Users, mobileOrder: 12 }
  );

  if (basePath === "/director") {
    links.splice(6, 0, {
      href: "/director/hub",
      label: "Hub stock",
      icon: Boxes,
      mobileOrder: 6,
    });
    const loyaltyIdx = links.findIndex((link) => link.href === `${basePath}/loyalty`);
    if (loyaltyIdx >= 0) {
      links[loyaltyIdx] = {
        href: "/director/clients",
        label: "Clients & Fidélité",
        icon: Gift,
        mobileOrder: 9,
      };
    }
    links.splice(11, 0, {
      href: "/director/hubs",
      label: "Dépôts",
      icon: Users,
      mobileOrder: 11,
    });
  }

  return links;
}

export function getSettingsNavItem(role: UserRole): NavLinkItem {
  return {
    href: getSettingsPath(role),
    label: "Paramètres",
    icon: Settings,
    mobileOrder: 99,
  };
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
}): NavLinkItem[] {
  const basePath = getManagementBasePath(input.role);
  const pageProfile = {
    role: input.role,
    allowed_pages: input.allowedPages ?? null,
    access_preset: input.accessPreset ?? null,
  };

  if (input.role === "livreur") {
    return filterNavLinksByPages(
      [...livreurLinks, getSettingsNavItem(input.role)],
      pageProfile
    );
  }

  if (input.role === "cashier") {
    const links = input.planningOnlyNav ? personalCashierLinks : cashierLinks;
    return filterNavLinksByPages(
      [...links, getSettingsNavItem(input.role)],
      pageProfile
    );
  }

  let links = basePath ? buildManagementLinks(basePath) : cashierLinks;

  if (input.hideMobilePos) {
    links = links.filter((link) => link.href !== "/cashier/pos");
  }

  links = filterNavLinksByPages(links, pageProfile);

  return [...links, getSettingsNavItem(input.role)].filter(
    (link, index, all) => all.findIndex((item) => item.href === link.href) === index
  );
}

export function isNavLinkActive(pathname: string, href: string): boolean {
  if (href === "/manager" || href === "/director" || href === "/hub") {
    return pathname === href;
  }
  if (href === "/director/clients") {
    if (pathname === href) return true;
    if (pathname.startsWith("/director/loyalty")) return true;
    return pathname.startsWith(`${href}/`);
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
