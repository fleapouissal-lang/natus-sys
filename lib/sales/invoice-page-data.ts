import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getActiveStores } from "@/lib/inventory";
import { getHubRetailStoresForTransfer } from "@/lib/hub";
import { fetchInvoicesByStoreIds, fetchInvoiceById } from "@/lib/sales/fetch-invoices";
import { getInvoicesBasePath } from "@/lib/sales/invoice-routes";
import { getCityFilter, isDirector, isHub, isManager } from "@/lib/permissions";
import { getSelectedStore } from "@/lib/management-store";
import type { Profile, Store } from "@/lib/types";

export type InvoicePageScope = "cashier" | "manager" | "director" | "hub";

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
  const retailStores = stores.filter((store) => !store.is_hub);
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

  if (scope === "cashier" && profile.role !== "cashier") {
    redirect(basePath);
  }
  if (scope === "manager" && !isManager(profile) && !isDirector(profile)) {
    redirect(basePath);
  }
  if (scope === "director" && !isDirector(profile)) {
    redirect(basePath);
  }
  if (scope === "hub" && !isHub(profile)) {
    redirect(basePath);
  }

  const { stores, storeIds, scopeLabel, selectedStoreId } = await resolveStoreScope(
    profile,
    scope,
    searchParams?.store
  );

  const supabase = await createClient();
  const { sales, error } = await fetchInvoicesByStoreIds(supabase, storeIds);

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
  };
}

export async function loadInvoiceDetailPage(scope: InvoicePageScope, saleId: string) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const basePath = getInvoicesBasePath(profile.role);
  if (!basePath) notFound();

  const supabase = await createClient();
  const { sale, error } = await fetchInvoiceById(supabase, saleId);

  if (error || !sale) {
    notFound();
  }

  const { storeIds, scopeLabel } = await resolveStoreScope(profile, scope);
  if (sale.store_id && storeIds.length > 0 && !storeIds.includes(sale.store_id)) {
    notFound();
  }

  if (scope === "cashier" && profile.role === "cashier" && sale.store_id !== profile.store_id) {
    notFound();
  }

  return {
    sale,
    listPath: basePath,
    scopeLabel: sale.stores?.name
      ? `${sale.stores.name}${sale.stores.city ? ` — ${sale.stores.city}` : ""}`
      : scopeLabel,
  };
}
