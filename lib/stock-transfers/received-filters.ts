import { getSelectedStore } from "@/lib/management-store";
import { isDirector, isManager } from "@/lib/permissions";
import { toLocalDateKey } from "@/lib/utils";
import type { Profile, Store } from "@/lib/types";

export type ReceivedTransferKind = "all" | "store" | "hub" | "mixed" | "depot";

export type ReceivedTransfersSearchParams = {
  city?: string;
  store?: string;
  from?: string;
  to?: string;
  type?: string;
  tab?: string;
  product?: string;
  q?: string;
  status?: string;
  source?: string;
  dest?: string;
  /** Dates de filtrage (stocks envoyés — évite conflit avec ?from/?to magasins) */
  sentFrom?: string;
  sentTo?: string;
  /** Destination filtre liste stocks envoyés (évite conflit avec ?dest= store|hub) */
  listDest?: string;
};

export type ReceivedTransferStatusFilter =
  | "all"
  | "en_attente"
  | "en_cours"
  | "pret"
  | "en_livraison"
  | "livre"
  | "received";

export type ReceivedTransfersFilterScope = {
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
  kind: ReceivedTransferKind;
  productQuery: string;
  status: ReceivedTransferStatusFilter;
  sourceStoreId: string;
  destStoreId: string;
};

export const RECEIVED_TRANSFER_STATUS_OPTIONS: {
  id: ReceivedTransferStatusFilter;
  label: string;
}[] = [
  { id: "all", label: "Tout" },
  { id: "en_attente", label: "En attente" },
  { id: "en_cours", label: "En cours" },
  { id: "pret", label: "Prête" },
  { id: "en_livraison", label: "En livraison" },
  { id: "livre", label: "Livré" },
  { id: "received", label: "Reçu" },
];

const VALID_STATUSES = new Set<ReceivedTransferStatusFilter>([
  "all",
  "en_attente",
  "en_cours",
  "pret",
  "en_livraison",
  "livre",
  "received",
]);

const VALID_KINDS = new Set<ReceivedTransferKind>([
  "all",
  "store",
  "hub",
  "mixed",
  "depot",
]);

export function parseReceivedTransferStatus(
  value?: string | null,
  fallback: ReceivedTransferStatusFilter = "all"
): ReceivedTransferStatusFilter {
  if (value && VALID_STATUSES.has(value as ReceivedTransferStatusFilter)) {
    return value as ReceivedTransferStatusFilter;
  }
  return fallback;
}

export function parseReceivedTransferKind(
  value?: string | null,
  fallback: ReceivedTransferKind = "all"
): ReceivedTransferKind {
  if (value && VALID_KINDS.has(value as ReceivedTransferKind)) {
    return value as ReceivedTransferKind;
  }
  return fallback;
}

/** Compatibilité anciens liens ?tab=store|hub|mixed|depot */
export function resolveReceivedTransferKind(
  params: ReceivedTransfersSearchParams,
  fallback: ReceivedTransferKind = "all"
): ReceivedTransferKind {
  if (params.type) return parseReceivedTransferKind(params.type, fallback);
  if (params.tab === "depot") return "depot";
  if (params.tab === "store") return "store";
  if (params.tab === "hub") return "hub";
  if (params.tab === "mixed") return "mixed";
  return fallback;
}

export function resolveReceivedTransfersScope(
  profile: Profile,
  scopedStores: Store[],
  params: ReceivedTransfersSearchParams,
  options?: {
    defaultKind?: ReceivedTransferKind;
    /** Gérant / caissier : ignorer ?dest= hors magasins du périmètre */
    restrictDestToScopedStores?: boolean;
    /** Gérant / caissier : ignorer ?source= hors magasins du périmètre */
    restrictSourceToScopedStores?: boolean;
    /** Caissier : source figée sur le magasin du compte */
    lockSourceToScopedStore?: boolean;
  }
): ReceivedTransfersFilterScope {
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

  let destStoreId = params.dest?.trim() || "";
  if (
    options?.restrictDestToScopedStores &&
    destStoreId &&
    !scopedStores.some((store) => store.id === destStoreId)
  ) {
    destStoreId = "";
  }

  let sourceStoreId = params.source?.trim() || "";
  if (
    options?.restrictSourceToScopedStores &&
    sourceStoreId &&
    !scopedStores.some((store) => store.id === sourceStoreId)
  ) {
    sourceStoreId = "";
  }
  if (options?.lockSourceToScopedStore && scopedStores.length === 1) {
    sourceStoreId = scopedStores[0].id;
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
    kind: resolveReceivedTransferKind(params, options?.defaultKind ?? "all"),
    productQuery: (params.q ?? params.product)?.trim() || "",
    status: parseReceivedTransferStatus(params.status),
    sourceStoreId,
    destStoreId,
  };
}

/** Filtres liste stocks envoyés (?sentFrom/?sentTo pour les dates). */
export function resolveSentTransfersListScope(
  profile: Profile,
  scopedStores: Store[],
  params: ReceivedTransfersSearchParams,
  options?: {
    restrictDestToScopedStores?: boolean;
    restrictSourceToScopedStores?: boolean;
    lockSourceToScopedStore?: boolean;
  }
): ReceivedTransfersFilterScope {
  return resolveReceivedTransfersScope(
    profile,
    scopedStores,
    {
      ...params,
      from: params.sentFrom,
      to: params.sentTo,
      dest: params.listDest,
    },
    options
  );
}

export function filterTransfersBySentDate<T extends { sent_at: string }>(
  transfers: T[],
  dateFrom: string,
  dateTo: string
): T[] {
  if (!dateFrom && !dateTo) return transfers;

  return transfers.filter((transfer) => {
    const key = toLocalDateKey(new Date(transfer.sent_at));
    if (dateFrom && key < dateFrom) return false;
    if (dateTo && key > dateTo) return false;
    return true;
  });
}
