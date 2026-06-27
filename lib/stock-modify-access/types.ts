export type StockModifyAccessStatus = "pending" | "approved" | "rejected";

export type StockModifyAccessRequest = {
  id: string;
  requester_id: string;
  requester_role: "manager" | "hub";
  status: StockModifyAccessStatus;
  valid_from: string;
  valid_to: string;
  hub_store_id: string | null;
  request_note: string | null;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  store_ids?: string[];
  requester?: { full_name: string | null; email: string; city: string | null };
  reviewer?: { full_name: string | null; email: string } | null;
  stores?: { id: string; name: string; city: string }[];
  hub_store?: { id: string; name: string; city: string } | null;
};

export type StockModifyAccessMovement = {
  id: string;
  product_id: string;
  quantity: number;
  type: string;
  notes: string | null;
  created_at: string;
  store_id: string | null;
  access_request_id: string | null;
  product?: { name: string; barcode: string | null } | null;
  store?: { name: string; city: string } | null;
  actor?: { full_name: string | null; email: string; role: string } | null;
  access_request?: {
    valid_from: string;
    valid_to: string;
    requester_role: string;
  } | null;
};

export type ActiveStockModifyGrant = {
  requestId: string;
  storeId: string;
  validFrom: string;
  validTo: string;
  canEditTotal: boolean;
};

export const STOCK_MODIFY_ACCESS_STATUS_LABELS: Record<StockModifyAccessStatus, string> = {
  pending: "En attente",
  approved: "Approuvée",
  rejected: "Refusée / révoquée",
};
