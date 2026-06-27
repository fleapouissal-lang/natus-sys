import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import type { StoreProductWriteoff, StoreWriteoffStatus } from "@/lib/store-writeoffs/types";
import { getCityFilter, isDirector } from "@/lib/permissions";

const WRITEOFF_SELECT = `
  *,
  stores(name, city),
  creator:created_by(full_name, email),
  validator:validated_by(full_name, email),
  items:store_product_writeoff_items(
    id,
    product_id,
    quantity,
    products(id, name, barcode, image_url, price)
  )
`;

export async function getStoreProductWriteoffs(
  profile: Profile,
  opts: { status?: StoreWriteoffStatus | StoreWriteoffStatus[]; limit?: number } = {}
): Promise<StoreProductWriteoff[]> {
  const supabase = await createClient();
  const limit = opts.limit ?? 100;

  let query = supabase
    .from("store_product_writeoffs")
    .select(WRITEOFF_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (opts.status) {
    const statuses = Array.isArray(opts.status) ? opts.status : [opts.status];
    query = query.in("status", statuses);
  }

  if (profile.role === "cashier" && profile.store_id) {
    query = query.eq("store_id", profile.store_id);
  } else if (!isDirector(profile)) {
    const city = getCityFilter(profile);
    if (city) {
      const { data: stores } = await supabase.from("stores").select("id").eq("city", city);
      const storeIds = (stores || []).map((s) => s.id);
      if (storeIds.length > 0) {
        query = query.in("store_id", storeIds);
      } else {
        return [];
      }
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error("[store-writeoffs] list:", error.message);
    return [];
  }

  return (data || []) as StoreProductWriteoff[];
}

export async function getPendingWriteoffCount(profile: Profile): Promise<number> {
  if (profile.role !== "manager" && profile.role !== "directeur" && profile.role !== "admin") {
    return 0;
  }

  const pending = await getStoreProductWriteoffs(profile, { status: "pending", limit: 500 });
  return pending.length;
}
