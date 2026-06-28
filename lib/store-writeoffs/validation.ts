import { createClient } from "@/lib/supabase/server";
import { canValidateWriteoff, type StoreProductWriteoff } from "@/lib/store-writeoffs/types";
import type { Profile } from "@/lib/types";

const WRITEOFF_VALIDATION_SELECT = `
  id,
  status,
  stores(name, city, is_hub)
`;

export function writeoffValidationDeniedMessage(
  profile: Pick<Profile, "role">,
  writeoff: Pick<StoreProductWriteoff, "stores">
): string {
  if (writeoff.stores?.is_hub) {
    return "Seul un directeur peut valider une annulation de stock en dépôt (Hub).";
  }
  return "Seuls le gérant ou le directeur peuvent valider une annulation de stock en magasin.";
}

export async function getWriteoffForValidation(
  writeoffId: string
): Promise<Pick<StoreProductWriteoff, "id" | "status" | "stores"> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_product_writeoffs")
    .select(WRITEOFF_VALIDATION_SELECT)
    .eq("id", writeoffId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Pick<StoreProductWriteoff, "id" | "status" | "stores">;
}

export async function assertCanValidateWriteoff(
  profile: Pick<Profile, "role">,
  writeoffId: string
): Promise<{ ok: true; writeoff: Pick<StoreProductWriteoff, "id" | "status" | "stores"> } | { error: string }> {
  const writeoff = await getWriteoffForValidation(writeoffId);
  if (!writeoff) return { error: "Annulation introuvable" };
  if (writeoff.status !== "pending") {
    return { error: "Cette annulation a déjà été traitée" };
  }
  if (!canValidateWriteoff(profile, writeoff)) {
    return { error: writeoffValidationDeniedMessage(profile, writeoff) };
  }
  return { ok: true, writeoff };
}
