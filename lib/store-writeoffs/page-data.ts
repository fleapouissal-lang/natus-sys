import { getHubStoreByCity } from "@/lib/hub";
import { getActiveStores, getProductsWithStoreStock } from "@/lib/inventory";
import { getSelectedStore } from "@/lib/management-store";
import {
  filterRetailStoresByProfile,
  isDirector,
} from "@/lib/permissions";
import { getStoreProductWriteoffs } from "@/lib/store-writeoffs/list";
import type { StoreProductWriteoff } from "@/lib/store-writeoffs/types";
import type { Profile, Store } from "@/lib/types";

export type WriteoffsSearchParams = {
  city?: string;
  store?: string;
  from?: string;
  to?: string;
};

export type WriteoffsFilterScope = {
  stores: Store[];
  storesInCity: Store[];
  selectedCity: string;
  selectedStoreId: string;
  storeIds: string[];
  scopeLabel: string;
  showCityFilter: boolean;
  showStoreFilter: boolean;
  dateFrom: string;
  dateTo: string;
};

export function resolveWriteoffsStoreScope(
  profile: Profile,
  scopedStores: Store[],
  params: WriteoffsSearchParams
): WriteoffsFilterScope {
  const cities = [...new Set(scopedStores.map((s) => s.city))].sort();
  const singleStoreScope = scopedStores.length === 1;
  const singleCityScope = cities.length === 1;

  const showCityFilter =
    !singleStoreScope && (isDirector(profile) ? cities.length > 1 : cities.length > 1);

  const showStoreFilter = !singleStoreScope && scopedStores.length > 1;

  let selectedCity =
    params.city && cities.includes(params.city) ? params.city : "";

  if (!showCityFilter && singleCityScope) {
    selectedCity = cities[0];
  }

  let selectedStoreId =
    params.store && scopedStores.some((s) => s.id === params.store) ? params.store : "";

  const storesInCity = selectedCity
    ? scopedStores.filter((s) => s.city === selectedCity)
    : scopedStores;

  if (selectedStoreId && !storesInCity.some((s) => s.id === selectedStoreId)) {
    selectedStoreId = "";
  }

  const storeIds = selectedStoreId
    ? [selectedStoreId]
    : selectedCity
      ? storesInCity.map((s) => s.id)
      : scopedStores.map((s) => s.id);

  const selectedStore = selectedStoreId
    ? getSelectedStore(scopedStores, selectedStoreId)
    : undefined;

  let scopeLabel = "Tous vos magasins";
  if (isDirector(profile) && scopedStores.length > 0) {
    scopeLabel = "Tous les magasins";
  }
  if (selectedStore) {
    scopeLabel = `${selectedStore.name} — ${selectedStore.city}`;
  } else if (selectedCity) {
    scopeLabel = `Tous les magasins — ${selectedCity}`;
  } else if (singleStoreScope && scopedStores[0]) {
    scopeLabel = `${scopedStores[0].name} — ${scopedStores[0].city}`;
  } else if (isManager(profile) && profile.city && !showCityFilter) {
    scopeLabel = `Magasins — ${profile.city}`;
  }

  return {
    stores: scopedStores,
    storesInCity,
    selectedCity: showCityFilter ? selectedCity : "",
    selectedStoreId,
    storeIds,
    scopeLabel,
    showCityFilter,
    showStoreFilter,
    dateFrom: params.from?.trim() || "",
    dateTo: params.to?.trim() || "",
  };
}

export async function loadWriteoffsManagementPage(
  profile: Profile,
  params: WriteoffsSearchParams
): Promise<{
  pending: StoreProductWriteoff[];
  history: StoreProductWriteoff[];
  filter: WriteoffsFilterScope;
}> {
  const cityFilter = isDirector(profile) ? null : profile.city;
  const allStores = await getActiveStores(cityFilter);
  const scopedStores = isDirector(profile)
    ? allStores
    : filterRetailStoresByProfile(
        allStores.filter((store) => !store.is_hub),
        profile
      );

  const filter = resolveWriteoffsStoreScope(profile, scopedStores, params);

  const fetchOpts = {
    storeIds: filter.storeIds,
    dateFrom: filter.dateFrom || undefined,
    dateTo: filter.dateTo || undefined,
  };

  const [pending, history] = await Promise.all([
    getStoreProductWriteoffs(profile, {
      status: "pending",
      limit: 200,
      ...fetchOpts,
    }),
    getStoreProductWriteoffs(profile, {
      status: ["approved", "rejected"],
      limit: 100,
      ...fetchOpts,
    }),
  ]);

  return {
    pending,
    history,
    filter,
  };
}

export async function loadHubWriteoffsPage(profile: Profile): Promise<{
  hubStore: Store | null;
  products: Awaited<ReturnType<typeof getProductsWithStoreStock>>;
  writeoffs: StoreProductWriteoff[];
}> {
  if (!profile.city) {
    return { hubStore: null, products: [], writeoffs: [] };
  }

  const hubStore = await getHubStoreByCity(profile.city);
  if (!hubStore) {
    return { hubStore: null, products: [], writeoffs: [] };
  }

  const [products, writeoffs] = await Promise.all([
    getProductsWithStoreStock(hubStore.id),
    getStoreProductWriteoffs(profile, { limit: 30, storeIds: [hubStore.id] }),
  ]);

  return { hubStore, products, writeoffs };
}
