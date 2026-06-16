import "server-only";

import { createClient } from "@/lib/supabase/server";
import { DEFAULT_LOYALTY_SETTINGS } from "@/lib/loyalty/config";
import { mapLoyaltySettings, type LoyaltySettingsRow } from "@/lib/loyalty/settings";
import type { LoyaltySettings } from "@/lib/types";

export async function getLoyaltySettings(): Promise<LoyaltySettings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("loyalty_settings")
    .select("points_per_mad, point_value_mad, min_points_to_redeem")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return DEFAULT_LOYALTY_SETTINGS;
  return mapLoyaltySettings(data as LoyaltySettingsRow);
}

export async function getPublicLoyaltySettings(): Promise<LoyaltySettings> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_loyalty_settings");

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return DEFAULT_LOYALTY_SETTINGS;
  }

  return mapLoyaltySettings(data[0] as LoyaltySettingsRow);
}
