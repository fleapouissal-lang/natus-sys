import type { DayClosureStats } from "@/lib/sales/day-closure";

export const STORE_DAY_CLOSURE_CODE_TTL_HOURS = 2;

export type StoreDayClosurePending = {
  id: string;
  validation_code?: string | null;
  business_date: string;
  stats: DayClosureStats;
  requested_at: string;
  code_expires_at: string;
  cashier_code_confirmed: boolean;
};

export type StoreDayClosureValidated = {
  id: string;
  business_date: string;
  validated_at: string;
  auto_validated: boolean;
  stats: DayClosureStats;
};

export type StorePosDayState = {
  store_id: string;
  store_name: string;
  business_date: string;
  calendar_date: string;
  require_manager_code: boolean;
  can_request_closure: boolean;
  closure_blocked_reason?: string | null;
  day_closure_validated: boolean;
  validated_closure: StoreDayClosureValidated | null;
  pending: StoreDayClosurePending | null;
};

export type PendingStoreDayClosureRow = {
  id: string;
  store_id: string;
  store_name: string;
  store_city: string;
  business_date: string;
  validation_code: string;
  stats: DayClosureStats;
  requested_at: string;
  code_expires_at: string;
  requested_by_name: string;
  cashier_code_confirmed: boolean;
};

export type StoreDayClosureReportRow = {
  id: string;
  store_id: string;
  store_name: string;
  store_city: string;
  business_date: string;
  status: "pending" | "validated";
  validation_code?: string | null;
  stats: DayClosureStats;
  requested_at: string;
  requested_by_name: string;
  validated_at: string | null;
  validated_by_name: string | null;
  cashier_code_confirmed: boolean;
};

export function parseDayClosureStats(raw: unknown): DayClosureStats {
  const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const count = Number(row.count ?? 0);
  const total = Number(row.total ?? 0);

  return {
    count,
    total,
    cash: Number(row.cash ?? 0),
    card: Number(row.card ?? 0),
    cheque: Number(row.cheque ?? 0),
    cancelledCount: Number(row.cancelledCount ?? 0),
    cancelledTotal: Number(row.cancelledTotal ?? 0),
    averageTicket: count > 0 ? total / count : 0,
  };
}

export function parseStorePosDayState(raw: unknown): StorePosDayState | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (!row.store_id || !row.business_date) return null;

  const pendingRaw = row.pending;
  let pending: StoreDayClosurePending | null = null;

  if (pendingRaw && typeof pendingRaw === "object") {
    const p = pendingRaw as Record<string, unknown>;
    if (p.business_date) {
      pending = {
        id: String(p.id ?? ""),
        validation_code: p.validation_code ? String(p.validation_code) : null,
        business_date: String(p.business_date),
        stats: parseDayClosureStats(p.stats),
        requested_at: String(p.requested_at ?? ""),
        code_expires_at: String(p.code_expires_at ?? ""),
        cashier_code_confirmed: Boolean(p.cashier_code_confirmed),
      };
    }
  }

  const validatedRaw = row.validated_closure;
  let validated_closure: StoreDayClosureValidated | null = null;

  if (validatedRaw && typeof validatedRaw === "object") {
    const v = validatedRaw as Record<string, unknown>;
    if (v.business_date) {
      validated_closure = {
        id: String(v.id ?? ""),
        business_date: String(v.business_date),
        validated_at: String(v.validated_at ?? ""),
        auto_validated: Boolean(v.auto_validated),
        stats: parseDayClosureStats(v.stats),
      };
    }
  }

  return {
    store_id: String(row.store_id),
    store_name: String(row.store_name ?? "Magasin"),
    business_date: String(row.business_date),
    calendar_date: String(row.calendar_date ?? row.business_date ?? ""),
    require_manager_code: row.require_manager_code !== false,
    can_request_closure: row.can_request_closure !== false,
    closure_blocked_reason: row.closure_blocked_reason
      ? String(row.closure_blocked_reason)
      : null,
    day_closure_validated: Boolean(row.day_closure_validated),
    validated_closure,
    pending,
  };
}

export function parsePendingStoreDayClosureRow(raw: unknown): PendingStoreDayClosureRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (!row.id || !row.validation_code) return null;

  return {
    id: String(row.id),
    store_id: String(row.store_id),
    store_name: String(row.store_name ?? "Magasin"),
    store_city: String(row.store_city ?? ""),
    business_date: String(row.business_date),
    validation_code: String(row.validation_code),
    stats: parseDayClosureStats(row.stats),
    requested_at: String(row.requested_at ?? ""),
    code_expires_at: String(row.code_expires_at ?? ""),
    requested_by_name: String(row.requested_by_name ?? "—"),
    cashier_code_confirmed: Boolean(row.cashier_code_confirmed),
  };
}

export function parseStoreDayClosureReportRow(raw: unknown): StoreDayClosureReportRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (!row.id || !row.business_date) return null;

  const status = row.status === "validated" ? "validated" : "pending";

  return {
    id: String(row.id),
    store_id: String(row.store_id),
    store_name: String(row.store_name ?? "Magasin"),
    store_city: String(row.store_city ?? ""),
    business_date: String(row.business_date),
    status,
    validation_code: row.validation_code ? String(row.validation_code) : null,
    stats: parseDayClosureStats(row.stats),
    requested_at: String(row.requested_at ?? ""),
    requested_by_name: String(row.requested_by_name ?? "—"),
    validated_at: row.validated_at ? String(row.validated_at) : null,
    validated_by_name: row.validated_by_name ? String(row.validated_by_name) : null,
    cashier_code_confirmed: Boolean(row.cashier_code_confirmed),
  };
}
