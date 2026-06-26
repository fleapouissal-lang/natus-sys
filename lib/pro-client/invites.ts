import { createClient } from "@/lib/supabase/server";
import type { LoyaltyCustomer } from "@/lib/types";
import type { ProClientRegistrationStoreResult } from "@/lib/pro-client/types";

function mapStoreResult(raw: Record<string, unknown>): ProClientRegistrationStoreResult {
  const status = String(raw.status || "invalid");
  if (status === "open") {
    return {
      status: "open",
      storeName: String(raw.store_name || "Natus"),
    };
  }
  return { status: "invalid" };
}

export async function getProClientRegistrationStore(
  storeToken: string
): Promise<ProClientRegistrationStoreResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_pro_client_registration_store", {
    p_store_token: storeToken,
  });

  if (error) {
    console.error("[pro-client] store lookup:", error.message);
    return { status: "invalid" };
  }

  return mapStoreResult((data || {}) as Record<string, unknown>);
}

export async function getAllProClients(): Promise<LoyaltyCustomer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("is_pro_client", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[pro-client] list:", error.message);
    return [];
  }

  return (data || []) as LoyaltyCustomer[];
}

export async function getPendingProClients(): Promise<LoyaltyCustomer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("is_pro_client", true)
    .eq("pro_client_active", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[pro-client] pending:", error.message);
    return [];
  }

  return (data || []) as LoyaltyCustomer[];
}
