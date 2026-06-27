import { createClient } from "@/lib/supabase/server";

export type PosClosureSettings = {
  requireManagerCode: boolean;
  updatedAt: string | null;
};

export async function getPosClosureSettings(): Promise<PosClosureSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_pos_closure_settings");

  if (error || !data || typeof data !== "object") {
    return { requireManagerCode: true, updatedAt: null };
  }

  const row = data as Record<string, unknown>;
  return {
    requireManagerCode: row.require_manager_code !== false,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}
