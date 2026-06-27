"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { DayClosureStats } from "@/lib/sales/day-closure";
import { SALE_HISTORY_SELECT } from "@/lib/sales/sale-select";
import {
  parseDayClosureStats,
  parsePendingStoreDayClosureRow,
  parseStoreDayClosureReportRow,
  parseStorePosDayState,
  type PendingStoreDayClosureRow,
  type StoreDayClosureReportRow,
  type StorePosDayState,
} from "@/lib/sales/store-day-closure";
import type { Sale } from "@/lib/types";

const MANAGEMENT = ["directeur", "admin", "manager"] as const;
const CLOSURE_ROLES = [...MANAGEMENT, "cashier"] as const;

function revalidatePosClosurePaths() {
  revalidatePath("/cashier/pos");
  revalidatePath("/cashier/pos-closures");
  revalidatePath("/manager/pos-closures");
  revalidatePath("/director/pos-closures");
}

function actionError(message: string): { error: string } {
  return { error: message };
}

export async function getStorePosDayState(
  storeId: string
): Promise<{ state: StorePosDayState } | { error: string }> {
  try {
    const profile = await requireRole([...CLOSURE_ROLES]);
    if (!profile) return actionError("Non autorisé");
    if (!storeId) return actionError("Magasin requis");

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_store_pos_day_state", {
      p_store_id: storeId,
    });

    if (error) {
      console.error("[store-day-closure] get_store_pos_day_state:", error.message);
      return actionError(error.message);
    }

    const state = parseStorePosDayState(data);
    if (!state) return actionError("État caisse indisponible");

    return { state };
  } catch (err) {
    console.error("[store-day-closure] getStorePosDayState:", err);
    return actionError(err instanceof Error ? err.message : "Erreur serveur");
  }
}

export async function requestStoreDayClosure(
  storeId: string
): Promise<
  | {
      businessDate: string;
      storeName: string;
      stats: DayClosureStats;
      pending: true;
    }
  | { error: string }
> {
  try {
    const profile = await requireRole([...CLOSURE_ROLES]);
    if (!profile) return actionError("Non autorisé");
    if (!storeId) return actionError("Magasin requis");

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("request_store_day_closure", {
      p_store_id: storeId,
    });

    if (error) {
      console.error("[store-day-closure] request_store_day_closure:", error.message);
      return actionError(error.message);
    }

    const row = data as Record<string, unknown>;
    revalidatePosClosurePaths();

    return {
      businessDate: String(row.business_date),
      storeName: String(row.store_name ?? "Magasin"),
      stats: parseDayClosureStats(row.stats),
      pending: true,
    };
  } catch (err) {
    console.error("[store-day-closure] requestStoreDayClosure:", err);
    return actionError(err instanceof Error ? err.message : "Erreur serveur");
  }
}

export async function confirmStoreDayClosureCode(
  storeId: string,
  validationCode: string
): Promise<{ confirmed: true; cashierCodeConfirmed: true } | { error: string }> {
  try {
    const profile = await requireRole(["cashier"]);
    if (!profile) return actionError("Non autorisé — compte caisse requis");
    if (!storeId) return actionError("Magasin requis");

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("confirm_store_day_closure_code", {
      p_store_id: storeId,
      p_validation_code: validationCode.trim(),
    });

    if (error) {
      console.error("[store-day-closure] confirm_store_day_closure_code:", error.message);
      return actionError(error.message);
    }

    if (!data || (typeof data === "object" && (data as { status?: string }).status !== "confirmed")) {
      return actionError("Confirmation du code impossible");
    }

    revalidatePosClosurePaths();
    return { confirmed: true, cashierCodeConfirmed: true };
  } catch (err) {
    console.error("[store-day-closure] confirmStoreDayClosureCode:", err);
    return actionError(err instanceof Error ? err.message : "Erreur serveur");
  }
}

export async function listPendingStoreDayClosures(): Promise<
  | { closures: PendingStoreDayClosureRow[] }
  | { error: string }
> {
  try {
    const profile = await requireRole([...MANAGEMENT]);
    if (!profile) return actionError("Non autorisé");

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_pending_store_day_closures");

    if (error) {
      console.error("[store-day-closure] list_pending_store_day_closures:", error.message);
      return actionError(error.message);
    }

    const closures = (Array.isArray(data) ? data : [])
      .map(parsePendingStoreDayClosureRow)
      .filter((row): row is PendingStoreDayClosureRow => Boolean(row));

    return { closures };
  } catch (err) {
    console.error("[store-day-closure] listPendingStoreDayClosures:", err);
    return actionError(err instanceof Error ? err.message : "Erreur serveur");
  }
}

export async function listStoreDayClosures(
  storeId?: string
): Promise<{ closures: StoreDayClosureReportRow[] } | { error: string }> {
  try {
    const profile = await requireRole([...CLOSURE_ROLES]);
    if (!profile) return actionError("Non autorisé");

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_store_day_closures", {
      p_store_id: storeId ?? null,
      p_limit: 80,
    });

    if (error) {
      console.error("[store-day-closure] list_store_day_closures:", error.message);
      return actionError(error.message);
    }

    const closures = (Array.isArray(data) ? data : [])
      .map(parseStoreDayClosureReportRow)
      .filter((row): row is StoreDayClosureReportRow => Boolean(row));

    return { closures };
  } catch (err) {
    console.error("[store-day-closure] listStoreDayClosures:", err);
    return actionError(err instanceof Error ? err.message : "Erreur serveur");
  }
}

export async function getStoreDayClosureReportSales(
  storeId: string,
  businessDate: string
): Promise<{ sales: Sale[] } | { error: string }> {
  try {
    const profile = await requireRole([...CLOSURE_ROLES]);
    if (!profile) return actionError("Non autorisé");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sales")
      .select(SALE_HISTORY_SELECT)
      .eq("store_id", storeId)
      .eq("business_date", businessDate)
      .order("created_at", { ascending: false });

    if (error) {
      return actionError(error.message);
    }

    return { sales: (data || []) as Sale[] };
  } catch (err) {
    console.error("[store-day-closure] getStoreDayClosureReportSales:", err);
    return actionError(err instanceof Error ? err.message : "Erreur serveur");
  }
}

export async function validateStoreDayClosure(
  validationCode: string
): Promise<
  | {
      storeName: string;
      closedBusinessDate: string;
      nextBusinessDate: string;
    }
  | { error: string }
> {
  try {
    const profile = await requireRole([...MANAGEMENT]);
    if (!profile) return actionError("Non autorisé");

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("validate_store_day_closure", {
      p_validation_code: validationCode.trim(),
    });

    if (error) {
      console.error("[store-day-closure] validate_store_day_closure:", error.message);
      return actionError(error.message);
    }

    const row = data as Record<string, unknown>;
    revalidatePosClosurePaths();
    revalidatePath("/director/sales");
    revalidatePath("/manager/sales");
    revalidatePath("/cashier/sales");

    return {
      storeName: String(row.store_name ?? "Magasin"),
      closedBusinessDate: String(row.closed_business_date),
      nextBusinessDate: String(row.next_business_date),
    };
  } catch (err) {
    console.error("[store-day-closure] validateStoreDayClosure:", err);
    return actionError(err instanceof Error ? err.message : "Erreur serveur");
  }
}
