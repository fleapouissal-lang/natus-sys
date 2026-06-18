import {
  Banknote,
  Box,
  Clock,
  CreditCard,
  Globe,
  LayoutGrid,
  MapPin,
  Package,
  PackageCheck,
  RotateCcw,
  Shield,
  ShoppingBag,
  Store,
  Tag,
  Truck,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { SelectMenuOption } from "@/components/ui/select-menu";
import { workflowStatusLabel } from "@/lib/shopify/order-status";
import type { PaymentMethod, ShopifyPaymentType, ShopifyWorkflowStatus } from "@/lib/types";
import type { Store as StoreType } from "@/lib/types";

const WORKFLOW_ICONS: Record<ShopifyWorkflowStatus, LucideIcon> = {
  pending: Clock,
  preparing: Package,
  ready: PackageCheck,
  shipping: Truck,
  delivered: PackageCheck,
  returned: RotateCcw,
  paid: CreditCard,
  cancelled: Clock,
};

export function workflowStatusOptions(
  statuses: readonly ShopifyWorkflowStatus[],
  opts?: { icons?: boolean }
): SelectMenuOption[] {
  return statuses.map((status) => ({
    value: status,
    label: workflowStatusLabel(status),
    ...(opts?.icons !== false ? { icon: WORKFLOW_ICONS[status] } : {}),
  }));
}

export function paymentFilterOptions(): SelectMenuOption[] {
  return [
    { value: "", label: "Tous les paiements", icon: LayoutGrid },
    { value: "cash", label: "Espèces", icon: Banknote },
    { value: "card", label: "TPE", icon: CreditCard },
  ];
}

export function shopifyPaymentTypeFilterOptions(): SelectMenuOption[] {
  return [
    { value: "", label: "Tous les types", icon: Wallet },
    { value: "online", label: "E.L", icon: Globe },
    { value: "cod", label: "COD", icon: Truck },
  ];
}

export function shopifyOrderStatusFilterOptions(
  statuses: readonly ShopifyWorkflowStatus[]
): SelectMenuOption[] {
  return [
    { value: "", label: "Tous les statuts", icon: LayoutGrid },
    ...statuses.map((status) => ({
      value: status,
      label: workflowStatusLabel(status),
      icon: WORKFLOW_ICONS[status],
    })),
  ];
}

export function cityOptions(
  cities: readonly string[],
  opts?: { allLabel?: string; includeAll?: boolean }
): SelectMenuOption[] {
  const includeAll = opts?.includeAll ?? true;
  const items: SelectMenuOption[] = includeAll
    ? [{ value: "", label: opts?.allLabel ?? "Toutes les villes", icon: MapPin }]
    : [];

  return [
    ...items,
    ...cities.map((city) => ({ value: city, label: city, icon: MapPin })),
  ];
}

export function storeOptions(
  stores: Pick<StoreType, "id" | "name" | "city" | "is_hub">[],
  opts?: {
    allLabel?: string;
    showCity?: boolean;
    includeAll?: boolean;
  }
): SelectMenuOption[] {
  const showCity = opts?.showCity ?? true;
  const includeAll = opts?.includeAll ?? opts?.allLabel !== undefined;

  const items: SelectMenuOption[] = includeAll
    ? [{ value: "", label: opts?.allLabel ?? "Tous les magasins", icon: Store }]
    : [];

  return [
    ...items,
    ...stores.map((store) => ({
      value: store.id,
      label: showCity
        ? `${store.name}${store.is_hub ? " — Hub stock" : ""} (${store.city})`
        : store.name,
      icon: Store,
    })),
  ];
}

export function roleOptions(
  roles: readonly { value: string; label: string }[]
): SelectMenuOption[] {
  return roles.map((r) => ({
    value: r.value,
    label: r.label,
    icon: r.value === "manager" ? Shield : User,
  }));
}

export function categoryOptions(categories: readonly string[]): SelectMenuOption[] {
  return [
    { value: "", label: "Toutes les catégories", icon: LayoutGrid },
    ...categories.map((cat) => ({ value: cat, label: cat, icon: Tag })),
  ];
}

export function productPickOptions(
  products: { id: string; name: string; stock: number; barcode?: string }[]
): SelectMenuOption[] {
  return [
    { value: "", label: "Sélectionner un produit", icon: Package },
    ...products.map((p) => ({
      value: p.id,
      label: p.name,
      description: p.barcode
        ? `${p.barcode} · Stock : ${p.stock}`
        : `Stock : ${p.stock}`,
      icon: Box,
    })),
  ];
}

export function activityTypeOptions(
  options: readonly { value: string; label: string }[]
): SelectMenuOption[] {
  const icons: Record<string, LucideIcon> = {
    "": LayoutGrid,
    stock_add: Package,
    stock_adjustment: PackageCheck,
    stock_transfer_in: Package,
    stock_transfer_out: Package,
    sale: ShoppingBag,
  };
  return options.map((o) => ({
    value: o.value,
    label: o.label,
    icon: icons[o.value] || LayoutGrid,
  }));
}

export function activityRoleOptions(
  options: readonly { value: string; label: string }[]
): SelectMenuOption[] {
  const icons: Record<string, LucideIcon> = {
    "": Users,
    directeur: Shield,
    admin: Shield,
    hub: Store,
    manager: User,
    cashier: User,
    livreur: Truck,
  };
  return options.map((o) => ({
    value: o.value,
    label: o.label,
    icon: icons[o.value] || Users,
  }));
}

export type { PaymentMethod };

export function cashierConfirmationStatusOptions(): SelectMenuOption[] {
  return [
    { value: "confirmed", label: "Confirmée (appel)" },
    { value: "not_confirmed", label: "Non confirmée" },
    { value: "no_response", label: "Pas de réponse" },
    { value: "not_interested", label: "Pas intéressé" },
  ];
}
