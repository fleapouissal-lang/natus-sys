import { getRoleLabel, isDirector, isManager } from "@/lib/permissions";
import type { Product, Profile, UserRole } from "@/lib/types";

export const MAX_WRITEOFF_PHOTOS = 5;

export type StoreWriteoffReason = "expired" | "broken";
export type StoreWriteoffStatus = "pending" | "approved" | "rejected";

export type StoreWriteoffItem = {
  id: string;
  product_id: string;
  quantity: number;
  reason: StoreWriteoffReason;
  products?: Pick<Product, "id" | "name" | "barcode" | "image_url" | "price"> | null;
};

export type StoreWriteoffPhoto = {
  id: string;
  writeoff_id: string;
  storage_path: string;
  public_url: string;
  sort_order: number;
  created_at?: string;
};

export type StoreProductWriteoff = {
  id: string;
  store_id: string;
  created_by: string;
  reason: StoreWriteoffReason | null;
  status: StoreWriteoffStatus;
  notes: string | null;
  validated_by: string | null;
  validated_at: string | null;
  rejection_note: string | null;
  created_at: string;
  updated_at: string;
  stores?: { name: string; city: string; is_hub?: boolean } | null;
  creator?: { full_name: string | null; email: string } | null;
  validator?: { full_name: string | null; email: string; role?: UserRole } | null;
  items?: StoreWriteoffItem[];
  photos?: StoreWriteoffPhoto[];
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

export function writeoffReasonSummary(
  writeoff: Pick<StoreProductWriteoff, "reason" | "items">
): string {
  const itemReasons = (writeoff.items || [])
    .map((item) => item.reason)
    .filter((reason): reason is StoreWriteoffReason => Boolean(reason));

  const unique = new Set(itemReasons);
  if (unique.size > 1) return "Périmé et cassé";
  if (unique.size === 1) return WRITEOFF_REASON_LABELS[[...unique][0]];
  if (writeoff.reason) return WRITEOFF_REASON_LABELS[writeoff.reason];
  return "Retour en stock";
}

export function writeoffValidatorLine(
  writeoff: Pick<StoreProductWriteoff, "status" | "validator">
): string | null {
  if (!writeoff.validator || writeoff.status === "pending") return null;

  const name = writeoff.validator.full_name || writeoff.validator.email || "—";
  const roleLabel = writeoff.validator.role
    ? getRoleLabel(writeoff.validator.role)
    : "Responsable";

  if (writeoff.status === "approved") {
    return `Validé par ${roleLabel} : ${name}`;
  }
  if (writeoff.status === "rejected") {
    return `Refusé par ${roleLabel} : ${name}`;
  }
  return null;
}

/** Magasin : gérant ou directeur. Dépôt Hub : directeur uniquement. */
export function canValidateWriteoff(
  profile: Pick<Profile, "role">,
  writeoff: Pick<StoreProductWriteoff, "stores">
): boolean {
  if (isDirector(profile)) return true;
  if (isManager(profile)) return !writeoff.stores?.is_hub;
  return false;
}

export function writeoffCreatorLabel(
  writeoff: Pick<StoreProductWriteoff, "stores">
): string {
  return writeoff.stores?.is_hub ? "Dépôt" : "Caissier";
}
