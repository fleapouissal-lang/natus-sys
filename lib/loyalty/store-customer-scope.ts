import { createClient } from "@/lib/supabase/server";
import type { Profile, LoyaltyCustomer } from "@/lib/types";
import { getCityFilter, isDirector } from "@/lib/permissions";

const CUSTOMER_SELECT = "*, stores:store_id(name, city)";

async function getPurchasedCustomerIdsAtStore(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storeId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("customer_id")
    .eq("store_id", storeId)
    .not("customer_id", "is", null)
    .is("cancelled_at", null);

  if (error) {
    console.error("[store-customer-scope] sales:", error.message);
    return [];
  }

  return [
    ...new Set(
      (data || [])
        .map((row) => row.customer_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
}

function mergeCustomers(rows: LoyaltyCustomer[]): LoyaltyCustomer[] {
  const byId = new Map<string, LoyaltyCustomer>();
  for (const row of rows) {
    byId.set(row.id, row);
  }
  return [...byId.values()];
}

async function fetchStoreAccountCustomers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storeId: string,
  proOnly: boolean,
  limit: number
): Promise<LoyaltyCustomer[]> {
  const purchasedIds = await getPurchasedCustomerIdsAtStore(supabase, storeId);

  const registeredQuery = supabase
    .from("customers")
    .select(CUSTOMER_SELECT)
    .eq("is_pro_client", proOnly)
    .eq("store_id", storeId)
    .limit(limit);

  const { data: registered, error: registeredError } = await registeredQuery;
  if (registeredError) {
    console.error("[store-customer-scope] registered:", registeredError.message);
    return [];
  }

  if (purchasedIds.length === 0) {
    return (registered || []) as LoyaltyCustomer[];
  }

  const { data: purchasers, error: purchasersError } = await supabase
    .from("customers")
    .select(CUSTOMER_SELECT)
    .eq("is_pro_client", proOnly)
    .in("id", purchasedIds)
    .limit(limit);

  if (purchasersError) {
    console.error("[store-customer-scope] purchasers:", purchasersError.message);
    return (registered || []) as LoyaltyCustomer[];
  }

  return mergeCustomers([
    ...((registered || []) as LoyaltyCustomer[]),
    ...((purchasers || []) as LoyaltyCustomer[]),
  ]);
}

async function fetchCityCustomers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  city: string,
  proOnly: boolean,
  limit: number
): Promise<LoyaltyCustomer[]> {
  const { data: stores } = await supabase.from("stores").select("id").eq("city", city);
  const storeIds = (stores || []).map((store) => store.id);
  if (storeIds.length === 0) return [];

  const { data, error } = await supabase
    .from("customers")
    .select(CUSTOMER_SELECT)
    .eq("is_pro_client", proOnly)
    .in("store_id", storeIds)
    .limit(limit);

  if (error) {
    console.error("[store-customer-scope] city:", error.message);
    return [];
  }

  return (data || []) as LoyaltyCustomer[];
}

export async function fetchCustomersForStoreAccount(
  profile: Profile,
  proOnly: boolean,
  limit = 500
): Promise<LoyaltyCustomer[]> {
  const supabase = await createClient();

  if (isDirector(profile)) {
    const { data, error } = await supabase
      .from("customers")
      .select(CUSTOMER_SELECT)
      .eq("is_pro_client", proOnly)
      .limit(limit);

    if (error) {
      console.error("[store-customer-scope] director:", error.message);
      return [];
    }

    return (data || []) as LoyaltyCustomer[];
  }

  if (profile.role === "cashier" && profile.store_id) {
    return fetchStoreAccountCustomers(supabase, profile.store_id, proOnly, limit);
  }

  const city = getCityFilter(profile);
  if (city) {
    return fetchCityCustomers(supabase, city, proOnly, limit);
  }

  if (profile.store_id) {
    return fetchStoreAccountCustomers(supabase, profile.store_id, proOnly, limit);
  }

  return [];
}

export async function customerHasPurchasedAtStore(
  supabase: Awaited<ReturnType<typeof createClient>>,
  customerId: string,
  storeId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .eq("store_id", storeId)
    .is("cancelled_at", null);

  if (error) return false;
  return (count ?? 0) > 0;
}

export function customerRegisteredAtStore(
  customer: Pick<LoyaltyCustomer, "store_id">,
  storeId: string
): boolean {
  return customer.store_id === storeId;
}
