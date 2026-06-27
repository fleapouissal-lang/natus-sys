import { createClient } from "@/lib/supabase/server";
import type { SaleChequeRow, SaleChequeStatus } from "@/lib/sales/cheques/types";

const CHEQUE_SELECT =
  "*, sale:sale_id(id, total, created_at, customer_name, cancelled_at), store:store_id(name, city), cashier:created_by(full_name, email)";

function mapRow(row: Record<string, unknown>): SaleChequeRow {
  const sale = row.sale as SaleChequeRow["sale"] | SaleChequeRow["sale"][] | null;
  const store = row.store as SaleChequeRow["store"] | SaleChequeRow["store"][] | null;
  const cashier = row.cashier as SaleChequeRow["cashier"] | SaleChequeRow["cashier"][] | null;

  return {
    id: row.id as string,
    sale_id: row.sale_id as string,
    store_id: row.store_id as string,
    bank_name: row.bank_name as string,
    cheque_number: row.cheque_number as string,
    cheque_amount: Number(row.cheque_amount),
    drawer_name: (row.drawer_name as string | null) ?? null,
    issue_date: (row.issue_date as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    status: (row.status as SaleChequeStatus) ?? "pending",
    status_updated_at: (row.status_updated_at as string | null) ?? null,
    status_updated_by: (row.status_updated_by as string | null) ?? null,
    updated_at: (row.updated_at as string) ?? (row.created_at as string),
    updated_by: (row.updated_by as string | null) ?? null,
    created_by: row.created_by as string,
    created_at: row.created_at as string,
    sale: Array.isArray(sale) ? sale[0] : sale,
    store: Array.isArray(store) ? store[0] : store,
    cashier: Array.isArray(cashier) ? cashier[0] : cashier,
  };
}

export async function listSaleCheques(input?: {
  storeIds?: string[];
  limit?: number;
}): Promise<SaleChequeRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("sale_cheques")
    .select(CHEQUE_SELECT)
    .order("created_at", { ascending: false })
    .limit(input?.limit ?? 200);

  if (input?.storeIds?.length) {
    query = query.in("store_id", input.storeIds);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[sale-cheques] list:", error.message);
    return [];
  }

  return (data || []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function getSaleChequeBySaleId(saleId: string): Promise<SaleChequeRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sale_cheques")
    .select(CHEQUE_SELECT)
    .eq("sale_id", saleId)
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
}
