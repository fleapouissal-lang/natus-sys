import { toLocalDateKey } from "@/lib/utils";
import type {
  ActiveStockModifyGrant,
  StockModifyAccessRequest,
} from "@/lib/stock-modify-access/types";

export function formatAccessPeriod(from: string, to: string): string {
  return `${from} → ${to}`;
}

export function isDateInAccessPeriod(
  request: Pick<StockModifyAccessRequest, "valid_from" | "valid_to">,
  dateKey: string = toLocalDateKey(new Date())
): boolean {
  return dateKey >= request.valid_from && dateKey <= request.valid_to;
}

export function getRequestStoreIds(
  request: Pick<StockModifyAccessRequest, "store_ids" | "stores">
): string[] {
  if (request.store_ids?.length) return request.store_ids;
  return request.stores?.map((store) => store.id) ?? [];
}

export function requestAppliesToStore(
  request: Pick<
    StockModifyAccessRequest,
    "requester_role" | "hub_store_id" | "store_ids" | "stores"
  >,
  storeId: string
): boolean {
  if (request.requester_role === "hub") {
    return request.hub_store_id === storeId;
  }
  return getRequestStoreIds(request).includes(storeId);
}

function sortByReviewedAtDesc(
  a: Pick<StockModifyAccessRequest, "reviewed_at">,
  b: Pick<StockModifyAccessRequest, "reviewed_at">
): number {
  return new Date(b.reviewed_at!).getTime() - new Date(a.reviewed_at!).getTime();
}

function getLatestReviewedForStore(
  requests: StockModifyAccessRequest[],
  storeId: string,
  dateKey: string
): StockModifyAccessRequest | null {
  const applicable = requests.filter(
    (request) =>
      isDateInAccessPeriod(request, dateKey) && requestAppliesToStore(request, storeId)
  );

  const reviewed = applicable
    .filter(
      (request) =>
        request.reviewed_at &&
        (request.status === "approved" || request.status === "rejected")
    )
    .sort(sortByReviewedAtDesc);

  return reviewed[0] ?? null;
}

/** @deprecated Préférer resolveEffectiveStockModifyGrant ou isRequestEffectiveGrant. */
export function isAccessRequestActive(
  request: Pick<StockModifyAccessRequest, "status" | "valid_from" | "valid_to">
): boolean {
  if (request.status !== "approved") return false;
  return isDateInAccessPeriod(request);
}

export function resolveEffectiveStockModifyGrant(
  requests: StockModifyAccessRequest[],
  storeId: string,
  dateKey: string = toLocalDateKey(new Date())
): Pick<ActiveStockModifyGrant, "requestId" | "validFrom" | "validTo"> | null {
  const latest = getLatestReviewedForStore(requests, storeId, dateKey);
  if (!latest || latest.status !== "approved") return null;

  return {
    requestId: latest.id,
    validFrom: latest.valid_from,
    validTo: latest.valid_to,
  };
}

export function hasRejectedAccessForStore(
  requests: StockModifyAccessRequest[],
  storeId: string,
  dateKey: string = toLocalDateKey(new Date())
): boolean {
  const latest = getLatestReviewedForStore(requests, storeId, dateKey);
  return latest?.status === "rejected";
}

export function isRequestEffectiveGrant(
  request: StockModifyAccessRequest,
  requesterRequests: StockModifyAccessRequest[],
  dateKey: string = toLocalDateKey(new Date())
): boolean {
  if (request.status !== "approved" || !isDateInAccessPeriod(request, dateKey)) {
    return false;
  }

  if (request.requester_role === "hub") {
    if (!request.hub_store_id) return false;
    const effective = resolveEffectiveStockModifyGrant(
      requesterRequests,
      request.hub_store_id,
      dateKey
    );
    return effective?.requestId === request.id;
  }

  const storeIds = getRequestStoreIds(request);
  return storeIds.some((storeId) => {
    const effective = resolveEffectiveStockModifyGrant(requesterRequests, storeId, dateKey);
    return effective?.requestId === request.id;
  });
}
