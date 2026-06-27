import { toLocalDateKey } from "@/lib/utils";
import type { StockModifyAccessRequest } from "@/lib/stock-modify-access/types";

export function formatAccessPeriod(from: string, to: string): string {
  return `${from} → ${to}`;
}

export function isAccessRequestActive(
  request: Pick<StockModifyAccessRequest, "status" | "valid_from" | "valid_to">
): boolean {
  if (request.status !== "approved") return false;
  const today = toLocalDateKey(new Date());
  return today >= request.valid_from && today <= request.valid_to;
}
