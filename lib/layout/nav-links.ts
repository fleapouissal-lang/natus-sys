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
  ShoppingBag,
  Truck,
  RotateCcw,
  Boxes,
  Gift,
  AlertTriangle,
  MessageSquare,
  FileText,
  CalendarClock,
  Newspaper,
} from "lucide-react";
import { getManagementBasePath } from "@/lib/permissions";
import type { UserRole } from "@/lib/types";

export type NavLinkItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Priorité barre mobile (plus petit = plus important) */
  mobileOrder?: number;
};

export const personalCashierLinks: NavLinkItem[] = [
  { href: "/cashier/planning", label: "Mon planning", icon: CalendarClock, mobileOrder: 0 },
];

export const cashierLinks: NavLinkItem[] = [
  { href: "/cashier/pos", label: "Caisse", icon: ShoppingCart, mobileOrder: 0 },
  { href: "/cashier/planning", label: "Planning", icon: CalendarClock, mobileOrder: 1 },
  { href: "/cashier/orders", label: "Commandes", icon: ShoppingBag, mobileOrder: 2 },
  { href: "/cashier/actualites", label: "Actualités", icon: Newspaper, mobileOrder: 3 },
  { href: "/cashier/sales", label: "Ventes", icon: History, mobileOrder: 4 },
  { href: "/cashier/notes", label: "Notes", icon: MessageSquare, mobileOrder: 5 },
  { href: "/cashier/transfers", label: "Hub", icon: Boxes, mobileOrder: 6 },
  { href: "/cashier/customers", label: "Fidélité", icon: Gift, mobileOrder: 7 },
  { href: "/cashier/returns", label: "Retours", icon: RotateCcw, mobileOrder: 8 },
  { href: "/cashier/invoices", label: "Factures", icon: FileText, mobileOrder: 9 },
];

export const livreurLinks: NavLinkItem[] = [
  { href: "/livreur/orders", label: "Livraisons", icon: Truck, mobileOrder: 0 },
  { href: "/livreur/actualites", label: "Actualités", icon: Newspaper, mobileOrder: 1 },
  { href: "/livreur/returns", label: "Retours", icon: RotateCcw, mobileOrder: 2 },
];

function buildManagementLinks(basePath: "/director" | "/manager" | "/hub"): NavLinkItem[] {
  if (basePath === "/hub") {
    return [
      { href: "/hub", label: "Accueil", icon: LayoutDashboard, mobileOrder: 0 },
      { href: "/hub/stock", label: "Stock", icon: Warehouse, mobileOrder: 1 },
      { href: "/hub/hub-stock", label: "Entrepôt", icon: Boxes, mobileOrder: 2 },
      { href: "/hub/activity", label: "Activité", icon: ClipboardList, mobileOrder: 3 },
      { href: "/hub/actualites", label: "Actus", icon: Newspaper, mobileOrder: 4 },
    ];
  }

  const links: NavLinkItem[] = [
    { href: basePath, label: "Accueil", icon: LayoutDashboard, mobileOrder: 0 },
    { href: `${basePath}/orders`, label: "Commandes", icon: ShoppingBag, mobileOrder: 1 },
    { href: `${basePath}/planning`, label: "Planning", icon: CalendarClock, mobileOrder: 2 },
    { href: "/cashier/pos", label: "Caisse", icon: ShoppingCart, mobileOrder: 3 },
    { href: `${basePath}/sales`, label: "Ventes", icon: Receipt, mobileOrder: 4 },
    { href: `${basePath}/stock`, label: "Stock", icon: Warehouse, mobileOrder: 5 },
    { href: `${basePath}/products`, label: "Produits", icon: Package, mobileOrder: 6 },
    { href: `${basePath}/stores`, label: "Magasins", icon: Store, mobileOrder: 7 },
    { href: `${basePath}/activity`, label: "Activité", icon: ClipboardList, mobileOrder: 8 },
    { href: `${basePath}/reclamations`, label: "Réclam.", icon: AlertTriangle, mobileOrder: 9 },
    { href: `${basePath}/loyalty`, label: "Fidélité", icon: Gift, mobileOrder: 10 },
    { href: `${basePath}/invoices`, label: "Factures", icon: FileText, mobileOrder: 11 },
    { href: `${basePath}/actualites`, label: "Actus", icon: Newspaper, mobileOrder: 12 },
    { href: `${basePath}/users`, label: "Users", icon: Users, mobileOrder: 13 },
  ];

  if (basePath === "/director") {
    links.splice(6, 0, {
      href: "/director/hub",
      label: "Hub stock",
      icon: Boxes,
      mobileOrder: 6,
    });
    links.splice(11, 0, {
      href: "/director/hubs",
      label: "Hubs",
      icon: Users,
      mobileOrder: 11,
    });
  }

  return links;
}

export function resolveNavLinks(input: {
  role: UserRole;
  isStorePos?: boolean;
  isPersonalCashier?: boolean;
  hasPosOperator?: boolean;
}): NavLinkItem[] {
  const basePath = getManagementBasePath(input.role);

  if (input.role === "livreur") return livreurLinks;

  if (input.role === "cashier") {
    if (input.isPersonalCashier) return personalCashierLinks;
    if (input.isStorePos) {
      return input.hasPosOperator
        ? cashierLinks
        : cashierLinks.filter((link) => link.href !== "/cashier/planning");
    }
    return cashierLinks;
  }

  if (basePath) return buildManagementLinks(basePath);
  return cashierLinks;
}

export function isNavLinkActive(pathname: string, href: string): boolean {
  if (href === "/manager" || href === "/director" || href === "/hub") {
    return pathname === href;
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
