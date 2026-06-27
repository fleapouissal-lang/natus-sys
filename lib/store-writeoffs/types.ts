import type { Product } from "@/lib/types";

export type StoreWriteoffReason = "expired" | "broken";
export type StoreWriteoffStatus = "pending" | "approved" | "rejected";

export type StoreWriteoffItem = {
  id: string;
  product_id: string;
  quantity: number;
  products?: Pick<Product, "id" | "name" | "barcode" | "image_url" | "price"> | null;
};

export type StoreProductWriteoff = {
  id: string;
  store_id: string;
  created_by: string;
  reason: StoreWriteoffReason;
  status: StoreWriteoffStatus;
  notes: string | null;
  validated_by: string | null;
  validated_at: string | null;
  rejection_note: string | null;
  created_at: string;
  updated_at: string;
  stores?: { name: string; city: string } | null;
  creator?: { full_name: string | null; email: string } | null;
  validator?: { full_name: string | null; email: string } | null;
  items?: StoreWriteoffItem[];
};

export const WRITEOFF_REASON_LABELS: Record<StoreWriteoffReason, string> = {
  expired: "Produit périmé",
  broken: "Produit cassé",
};

export const WRITEOFF_STATUS_LABELS: Record<StoreWriteoffStatus, string> = {
  pending: "En attente",
  approved: "Validé",
  rejected: "Refusé",
};
