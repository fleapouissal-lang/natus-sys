"use server";

import { requireRole } from "@/lib/auth";
import { getActiveStores } from "@/lib/inventory";
import { SALE_HISTORY_SELECT } from "@/lib/sales/sale-select";
import {
  getStoreDayClosureReportSales,
  listStoreDayClosures,
} from "@/lib/sales/store-day-closure-actions";
import {
  parseStoreDayClosureReportRow,
  type StoreDayClosureReportRow,
} from "@/lib/sales/store-day-closure";
import {
  buildZReportPayload,
  pickLatestValidatedClosures,
} from "@/lib/sales/z-report-analytics";
import type { ZReportClosureBlock, ZReportPayload, ZReportSiteOption } from "@/lib/sales/z-report-types";
import { createClient } from "@/lib/supabase/server";
import type { Sale, Store } from "@/lib/types";

function actionError(message: string): { error: string } {
  return { error: message };
}

function storeToSiteOption(store: Store): ZReportSiteOption {
  return {
    id: store.id,
    name: store.name,
    city: store.city,
    isHub: Boolean(store.is_hub),
  };
}

function scopeLabelForStore(store: ZReportSiteOption | undefined, multi: boolean): string {
  if (multi) return "Tous les magasins et dépôts";
  if (!store) return "Site";
  return `${store.name}${store.isHub ? " (dépôt)" : ""} — ${store.city}`;
}

async function loadClosureSales(
  closure: StoreDayClosureReportRow
): Promise<{ sales: Sale[] } | { error: string }> {
  const result = await getStoreDayClosureReportSales(closure.store_id, closure.business_date);
  if ("error" in result) return result;
  return { sales: result.sales };
}

export async function fetchZReportSites(): Promise<
  { sites: ZReportSiteOption[] } | { error: string }
> {
  try {
    const profile = await requireRole(["directeur", "admin"]);
    if (!profile) return actionError("Non autorisé");

    const stores = await getActiveStores();
    const sites = stores
      .map(storeToSiteOption)
      .sort((a, b) => {
        if (a.isHub !== b.isHub) return a.isHub ? 1 : -1;
        return a.name.localeCompare(b.name, "fr");
      });

    return { sites };
  } catch (err) {
    console.error("[z-report] fetchZReportSites:", err);
    return actionError(err instanceof Error ? err.message : "Erreur serveur");
  }
}

export async function fetchZReportPreview(
  storeId?: string | null
): Promise<
  | {
      scopeLabel: string;
      mode: ZReportPayload["mode"];
      closure: StoreDayClosureReportRow | null;
      sitesCount: number;
    }
  | { error: string }
> {
  try {
    const profile = await requireRole(["directeur", "admin"]);
    if (!profile) return actionError("Non autorisé");

    const listResult = await listStoreDayClosures();
    if ("error" in listResult) return listResult;

    const picked = pickLatestValidatedClosures(listResult.closures, storeId ?? null);
    const sites = await getActiveStores();
    const site = storeId ? sites.find((row) => row.id === storeId) : undefined;
    const multi = !storeId;

    return {
      scopeLabel: scopeLabelForStore(site ? storeToSiteOption(site) : undefined, multi),
      mode: multi ? "multi" : "single",
      closure: picked[0] ?? null,
      sitesCount: multi ? picked.length : picked.length > 0 ? 1 : 0,
    };
  } catch (err) {
    console.error("[z-report] fetchZReportPreview:", err);
    return actionError(err instanceof Error ? err.message : "Erreur serveur");
  }
}

export async function fetchZReportPayload(
  storeId?: string | null
): Promise<{ data: ZReportPayload } | { error: string }> {
  try {
    const profile = await requireRole(["directeur", "admin"]);
    if (!profile) return actionError("Non autorisé");

    const listResult = await listStoreDayClosures();
    if ("error" in listResult) return listResult;

    const picked = pickLatestValidatedClosures(listResult.closures, storeId ?? null);
    if (picked.length === 0) {
      return actionError(
        storeId
          ? "Aucune clôture validée pour ce site."
          : "Aucune clôture validée disponible."
      );
    }

    const blocks: ZReportClosureBlock[] = [];
    for (const closure of picked) {
      const salesResult = await loadClosureSales(closure);
      if ("error" in salesResult) return salesResult;
      blocks.push({ closure, sales: salesResult.sales });
    }

    const sites = await getActiveStores();
    const site = storeId ? sites.find((row) => row.id === storeId) : undefined;
    const multi = !storeId;

    return {
      data: buildZReportPayload(
        scopeLabelForStore(site ? storeToSiteOption(site) : undefined, multi),
        blocks,
        multi ? "multi" : "single"
      ),
    };
  } catch (err) {
    console.error("[z-report] fetchZReportPayload:", err);
    return actionError(err instanceof Error ? err.message : "Erreur serveur");
  }
}

/** Charge les ventes d'une clôture précise (aperçu ticket). */
export async function fetchZReportClosureSales(
  storeId: string,
  businessDate: string
): Promise<{ sales: Sale[] } | { error: string }> {
  try {
    const profile = await requireRole(["directeur", "admin"]);
    if (!profile) return actionError("Non autorisé");
    return getStoreDayClosureReportSales(storeId, businessDate);
  } catch (err) {
    console.error("[z-report] fetchZReportClosureSales:", err);
    return actionError(err instanceof Error ? err.message : "Erreur serveur");
  }
}

/** Liste étendue pour analyse multi-clôtures (directeur). */
export async function fetchZReportClosureCatalog(): Promise<
  { closures: StoreDayClosureReportRow[] } | { error: string }
> {
  try {
    const profile = await requireRole(["directeur", "admin"]);
    if (!profile) return actionError("Non autorisé");

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_store_day_closures", {
      p_store_id: null,
      p_limit: 200,
    });

    if (error) {
      console.error("[z-report] list_store_day_closures:", error.message);
      return actionError(error.message);
    }

    const closures = (Array.isArray(data) ? data : [])
      .map(parseStoreDayClosureReportRow)
      .filter((row): row is StoreDayClosureReportRow => Boolean(row));

    return { closures };
  } catch (err) {
    console.error("[z-report] fetchZReportClosureCatalog:", err);
    return actionError(err instanceof Error ? err.message : "Erreur serveur");
  }
}

export async function fetchZReportPayloadFromClosures(
  closureIds: string[]
): Promise<{ data: ZReportPayload } | { error: string }> {
  try {
    const profile = await requireRole(["directeur", "admin"]);
    if (!profile) return actionError("Non autorisé");
    if (closureIds.length === 0) return actionError("Sélectionnez au moins une clôture.");

    const catalog = await fetchZReportClosureCatalog();
    if ("error" in catalog) return catalog;

    const selected = catalog.closures.filter(
      (closure) =>
        closureIds.includes(closure.id) && closure.status === "validated"
    );
    if (selected.length === 0) return actionError("Aucune clôture validée sélectionnée.");

    const blocks: ZReportClosureBlock[] = [];
    for (const closure of selected) {
      const salesResult = await loadClosureSales(closure);
      if ("error" in salesResult) return salesResult;
      blocks.push({ closure, sales: salesResult.sales });
    }

    const uniqueStores = new Set(selected.map((closure) => closure.store_id));
    const mode: ZReportPayload["mode"] = uniqueStores.size > 1 ? "multi" : "single";
    const scopeLabel =
      uniqueStores.size > 1
        ? `${selected.length} clôtures — ${uniqueStores.size} sites`
        : `${selected[0]!.store_name} — ${formatDayClosureDateShort(selected[0]!.business_date)}`;

    return {
      data: buildZReportPayload(scopeLabel, blocks, mode),
    };
  } catch (err) {
    console.error("[z-report] fetchZReportPayloadFromClosures:", err);
    return actionError(err instanceof Error ? err.message : "Erreur serveur");
  }
}

function formatDayClosureDateShort(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function fetchZReportSalesDirect(
  storeId: string,
  businessDate: string
): Promise<{ sales: Sale[] } | { error: string }> {
  try {
    const profile = await requireRole(["directeur", "admin"]);
    if (!profile) return actionError("Non autorisé");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sales")
      .select(SALE_HISTORY_SELECT)
      .eq("store_id", storeId)
      .eq("business_date", businessDate)
      .order("created_at", { ascending: false });

    if (error) return actionError(error.message);
    return { sales: (data || []) as Sale[] };
  } catch (err) {
    return actionError(err instanceof Error ? err.message : "Erreur serveur");
  }
}
