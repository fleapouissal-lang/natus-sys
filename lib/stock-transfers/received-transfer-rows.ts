import type { HubStockTransfer, StoreStockTransfer } from "@/lib/types";
import type {
  ReceivedTransferKind,
  ReceivedTransferStatusFilter,
  ReceivedTransfersFilterScope,
} from "@/lib/stock-transfers/received-filters";
import { filterReceivedTransferRowsByLocation } from "@/lib/stock-transfers/received-location-filters";

export type ReceivedTransferFilterKind = Exclude<ReceivedTransferKind, "all">;

export type ReceivedTransferRow =
  | {
      id: string;
      sent_at: string;
      filterKind: ReceivedTransferFilterKind;
      typeLabel: string;
      source: "store";
      transfer: StoreStockTransfer;
    }
  | {
      id: string;
      sent_at: string;
      filterKind: ReceivedTransferFilterKind;
      typeLabel: string;
      source: "hub";
      transfer: HubStockTransfer;
    };

export type ReceivedTransferRowGroup = {
  kind: ReceivedTransferFilterKind;
  typeLabel: string;
  storeTransfers?: StoreStockTransfer[];
  hubTransfers?: HubStockTransfer[];
};

export function buildReceivedTransferRows(
  groups: ReceivedTransferRowGroup[]
): ReceivedTransferRow[] {
  const rows: ReceivedTransferRow[] = [];

  for (const group of groups) {
    for (const transfer of group.storeTransfers ?? []) {
      rows.push({
        id: `store-${transfer.id}`,
        sent_at: transfer.sent_at,
        filterKind: group.kind,
        typeLabel: group.typeLabel,
        source: "store",
        transfer,
      });
    }
    for (const transfer of group.hubTransfers ?? []) {
      rows.push({
        id: `hub-${transfer.id}`,
        sent_at: transfer.sent_at,
        filterKind: group.kind,
        typeLabel: group.typeLabel,
        source: "hub",
        transfer,
      });
    }
  }

  return rows.sort(
    (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
  );
}

export function filterReceivedTransferRowsByKind(
  rows: ReceivedTransferRow[],
  kind: ReceivedTransferKind
): ReceivedTransferRow[] {
  if (kind === "all") return rows;
  return rows.filter((row) => row.filterKind === kind);
}

export function filterReceivedTransferRowsByProductQuery(
  rows: ReceivedTransferRow[],
  query: string,
  productLookup?: ReceivedTransferProductLookup
): ReceivedTransferRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;

  return rows.filter((row) =>
    row.transfer.items.some((item) =>
      receivedTransferItemMatchesProductQuery(item, q, productLookup)
    )
  );
}

function receivedTransferItemMatchesProductQuery(
  item: {
    product_id: string;
    product_name: string;
    product_barcode: string;
    product_code?: string | null;
  },
  query: string,
  productLookup?: ReceivedTransferProductLookup
): boolean {
  const meta = productLookup?.[item.product_id];
  const name = (item.product_name || meta?.name || "").toLowerCase();
  const barcode = (item.product_barcode || meta?.barcode || "").toLowerCase();
  const code = (item.product_code || meta?.code || "").toLowerCase();
  const categories = meta?.categories ?? [];

  return (
    name.includes(query) ||
    barcode.includes(query) ||
    code.includes(query) ||
    categories.some((category) => category.toLowerCase().includes(query))
  );
}

export function filterReceivedTransferRowsByStatus(
  rows: ReceivedTransferRow[],
  status: ReceivedTransferStatusFilter
): ReceivedTransferRow[] {
  if (!status || status === "all") return rows;
  return rows.filter((row) => {
    const rowStatus = row.transfer.status;
    if (status === "livre") {
      return rowStatus === "livre" || rowStatus === "sent";
    }
    return rowStatus === status;
  });
}

export function applyReceivedTransferRowFilters(
  rows: ReceivedTransferRow[],
  filter: Pick<
    ReceivedTransfersFilterScope,
    "productQuery" | "status" | "sourceStoreId" | "destStoreId"
  >,
  productLookup?: ReceivedTransferProductLookup
): ReceivedTransferRow[] {
  let result = rows;
  result = filterReceivedTransferRowsByProductQuery(
    result,
    filter.productQuery,
    productLookup
  );
  result = filterReceivedTransferRowsByLocation(
    result,
    filter.sourceStoreId,
    filter.destStoreId
  );
  result = filterReceivedTransferRowsByStatus(result, filter.status);
  return result;
}

export type ReceivedTransferProductLookup = Record<
  string,
  {
    name: string;
    barcode: string;
    code: string;
    categories: string[];
  }
>;

export function buildReceivedTransferProductLookup(
  products: Array<{
    id: string;
    name: string;
    barcode?: string | null;
    product_code?: string | null;
    category?: string | null;
    categories?: string[];
  }>
): ReceivedTransferProductLookup {
  const lookup: ReceivedTransferProductLookup = {};

  for (const product of products) {
    const categories =
      product.categories && product.categories.length > 0
        ? product.categories
        : product.category
          ? [product.category]
          : [];

    lookup[product.id] = {
      name: product.name,
      barcode: product.barcode ?? "",
      code: product.product_code ?? "",
      categories,
    };
  }

  return lookup;
}
