import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getActiveStores } from "@/lib/inventory";
import { getHubRetailStoresForTransfer } from "@/lib/hub";
import { fetchInvoicesByStoreIds, fetchInvoiceById } from "@/lib/sales/fetch-invoices";
import {
  getStorePosInvoiceCreatedAfter,
  isWithinStorePosInvoiceHistory,
  STORE_POS_INVOICE_HISTORY_DAYS,
} from "@/lib/sales/invoice-history-window";
import { getInvoicesBasePath } from "@/lib/sales/invoice-routes";
import {
  getCityFilter,
  isDirector,
  isHub,
  isManager,
  filterRetailStoresByProfile,
} from "@/lib/permissions";
import { getSelectedStore } from "@/lib/management-store";
import { isSaleInvoiceValidated } from "@/lib/sales/invoice-validation";
import type { Profile, Store, UserRole } from "@/lib/types";

export type InvoicePageScope = "cashier" | "manager" | "director" | "hub";

function invoiceScopeForRole(role: UserRole): InvoicePageScope | null {
  if (role === "cashier") return "cashier";
  if (role === "manager") return "manager";
  if (role === "hub") return "hub";
  if (role === "directeur" || role === "admin") return "director";
  return null;
}

function invoiceDetailPath(basePath: string, saleId: string, storeParam?: string | null): string {
  const query =
    storeParam && storeParam.trim()
      ? `?store=${encodeURIComponent(storeParam.trim())}`
      : "";
  return `${basePath}/${saleId}${query}`;
}

async function resolveStoreScope(
  profile: Profile,
  scope: InvoicePageScope,
  storeParam?: string | null
): Promise<{
  stores: Store[];
  storeIds: string[];
  scopeLabel: string;
  selectedStoreId: string;
}> {
  if (scope === "cashier") {
    if (!profile.store_id) {
      return { stores: [], storeIds: [], scopeLabel: "Magasin non assigné", selectedStoreId: "" };
    }

    const supabase = await createClient();
    const { data: store } = await supabase
      .from("stores")
      .select("*")
      .eq("id", profile.store_id)
      .maybeSingle();

    const stores = store ? [store as Store] : [];
    return {
      stores,
      storeIds: profile.store_id ? [profile.store_id] : [],
      scopeLabel: store ? `${store.name} — ${store.city}` : "Magasin",
      selectedStoreId: profile.store_id,
    };
  }

  if (scope === "hub") {
    const city = profile.city;
    if (!city) {
      return { stores: [], storeIds: [], scopeLabel: "Ville non définie", selectedStoreId: "" };
    }

    const stores = await getHubRetailStoresForTransfer(profile.id);
    const selectedStoreId =
      storeParam && stores.some((store) => store.id === storeParam) ? storeParam : "";
    const selectedStore = getSelectedStore(stores, selectedStoreId);
    const storeIds = selectedStoreId
      ? [selectedStoreId]
      : stores.map((store) => store.id);

    return {
      stores,
      storeIds,
      scopeLabel: selectedStore
        ? `${selectedStore.name} — ${selectedStore.city}`
        : `Tous les magasins — ${city}`,
      selectedStoreId,
    };
  }

  const city = getCityFilter(profile);
  const stores = await getActiveStores(city);
  const retailStores = filterRetailStoresByProfile(
    stores.filter((store) => !store.is_hub),
    profile
  );
  const selectedStoreId =
    storeParam && retailStores.some((store) => store.id === storeParam) ? storeParam : "";
  const selectedStore = getSelectedStore(retailStores, selectedStoreId);
  const storeIds = selectedStoreId
    ? [selectedStoreId]
    : retailStores.map((store) => store.id);

  const scopeLabel = isDirector(profile)
    ? selectedStore
      ? `${selectedStore.name} — ${selectedStore.city}`
      : city
        ? `Tous les magasins — ${city}`
        : "Tous les magasins"
    : selectedStore
      ? `${selectedStore.name} — ${selectedStore.city}`
      : city
        ? `Tous les magasins — ${city}`
        : "Magasins gérés";

  return {
    stores: retailStores,
    storeIds,
    scopeLabel,
    selectedStoreId,
  };
}

export async function loadInvoicesListPage(
  scope: InvoicePageScope,
  searchParams?: { store?: string }
) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const basePath = getInvoicesBasePath(profile.role);
  if (!basePath) notFound();

  const roleScope = invoiceScopeForRole(profile.role);
  if (!roleScope || roleScope !== scope) {
    redirect(basePath);
  }

  const { stores, storeIds, scopeLabel, selectedStoreId } = await resolveStoreScope(
    profile,
    scope,
    searchParams?.store
  );

  const isStorePosAccount = profile.role === "cashier" && profile.is_store_pos === true;

  const supabase = await createClient();
  const { sales, error } = await fetchInvoicesByStoreIds(supabase, storeIds, {
    includePending: isDirector(profile),
    createdAfter: isStorePosAccount ? getStorePosInvoiceCreatedAfter() : undefined,
  });

  return {
    profile,
    sales,
    error,
    basePath,
    stores,
    selectedStoreId,
    scopeLabel,
    showStore: scope !== "cashier" && !selectedStoreId,
    showCashier: scope !== "cashier",
    canValidateInvoices: isDirector(profile),
    isStorePosAccount,
    invoiceHistoryDays: isStorePosAccount ? STORE_POS_INVOICE_HISTORY_DAYS : undefined,
  };
}

export async function loadInvoiceDetailPage(
  scope: InvoicePageScope,
  saleId: string,
  options?: { store?: string | null }
) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const basePath = getInvoicesBasePath(profile.role);
  if (!basePath) notFound();

  const roleScope = invoiceScopeForRole(profile.role);
  if (!roleScope) notFound();

  if (roleScope !== scope) {
    redirect(invoiceDetailPath(basePath, saleId, options?.store));
  }

  const supabase = await createClient();
  const { sale, error } = await fetchInvoiceById(supabase, saleId);

  if (error || !sale) {
    notFound();
  }

  if (sale.id !== saleId.trim()) {
    redirect(invoiceDetailPath(basePath, sale.id, options?.store));
  }

  const directorView = isDirector(profile);

  if (!directorView && !isSaleInvoiceValidated(sale)) {
    redirect(`${basePath}?pending=1`);
  }

  if (
    profile.role === "cashier" &&
    profile.is_store_pos &&
    !isWithinStorePosInvoiceHistory(sale.created_at)
  ) {
    notFound();
  }

  const { storeIds, scopeLabel } = await resolveStoreScope(
    profile,
    roleScope,
    options?.store
  );

  if (!directorView) {
    if (sale.store_id && storeIds.length > 0 && !storeIds.includes(sale.store_id)) {
      notFound();
    }

    if (
      roleScope === "cashier" &&
      profile.role === "cashier" &&
      sale.store_id &&
      profile.store_id &&
      sale.store_id !== profile.store_id
    ) {
      notFound();
    }
  }

  return {
    sale,
    listPath: options?.store
      ? `${basePath}?store=${encodeURIComponent(options.store.trim())}`
      : basePath,
    scopeLabel: sale.stores?.name
      ? `${sale.stores.name}${sale.stores.city ? ` — ${sale.stores.city}` : ""}`
      : scopeLabel,
    canValidateInvoices: directorView && !isSaleInvoiceValidated(sale),
  };
}
