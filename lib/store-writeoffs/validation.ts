import { createClient } from "@/lib/supabase/server";
import { canValidateWriteoff, type StoreProductWriteoff } from "@/lib/store-writeoffs/types";
import type { Profile } from "@/lib/types";

const WRITEOFF_VALIDATION_SELECT = `
  id,
  status,
  stores(name, city, is_hub)
`;

type WriteoffValidationRow = Pick<StoreProductWriteoff, "id" | "status" | "stores">;

function normalizeWriteoffStore(
  stores: unknown
): WriteoffValidationRow["stores"] {
  if (!stores) return null;
  if (Array.isArray(stores)) {
    const row = stores[0];
    return row && typeof row === "object" ? (row as NonNullable<WriteoffValidationRow["stores"]>) : null;
  }
  if (typeof stores === "object") {
    return stores as NonNullable<WriteoffValidationRow["stores"]>;
  }
  return null;
}

export function writeoffValidationDeniedMessage(
  profile: Pick<Profile, "role">,
  writeoff: Pick<StoreProductWriteoff, "stores">
): string {
  if (writeoff.stores?.is_hub) {
    return "Seul un directeur peut valider un retour en stock en dépôt (Hub).";
  }
  return "Seuls le gérant ou le directeur peuvent valider un retour en stock en magasin.";
}

export async function getWriteoffForValidation(
  writeoffId: string
): Promise<WriteoffValidationRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_product_writeoffs")
    .select(WRITEOFF_VALIDATION_SELECT)
    .eq("id", writeoffId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    status: data.status,
    stores: normalizeWriteoffStore(data.stores),
  };
}

export async function assertCanValidateWriteoff(
  profile: Pick<Profile, "role">,
  writeoffId: string
): Promise<{ ok: true; writeoff: WriteoffValidationRow } | { error: string }> {
  const writeoff = await getWriteoffForValidation(writeoffId);
  if (!writeoff) return { error: "Retour en stock introuvable" };
  if (writeoff.status !== "pending") {
    return { error: "Ce retour en stock a déjà été traité" };
  }
  if (!canValidateWriteoff(profile, writeoff)) {
    return { error: writeoffValidationDeniedMessage(profile, writeoff) };
  }
  return { ok: true, writeoff };
}
