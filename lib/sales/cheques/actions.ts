"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import type { SaleChequeDetails, SaleChequeStatus } from "@/lib/sales/cheques/types";
import { createClient } from "@/lib/supabase/server";

function revalidateChequePaths() {
  revalidatePath("/cashier/cheques");
  revalidatePath("/manager/cheques");
  revalidatePath("/director/cheques");
  revalidatePath("/cashier/sales");
  revalidatePath("/cashier/history");
  revalidatePath("/manager/sales");
  revalidatePath("/manager/history");
  revalidatePath("/director/sales");
  revalidatePath("/director/history");
  revalidatePath("/cashier/pos");
}

export async function updateSaleChequeStatus(
  chequeId: string,
  status: SaleChequeStatus
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["manager", "directeur", "admin"]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_sale_cheque_status", {
    p_cheque_id: chequeId,
    p_status: status,
  });

  if (error) return { error: error.message };

  revalidateChequePaths();
  return { success: true };
}

export async function updateSaleChequeDetails(
  chequeId: string,
  details: SaleChequeDetails
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["cashier", "directeur", "admin"]);
  if (!profile) return { error: "Non autorisé" };

  if (!details.bankName?.trim() || !details.chequeNumber?.trim()) {
    return { error: "Banque et numéro de chèque requis" };
  }

  if (!Number.isFinite(details.chequeAmount) || details.chequeAmount <= 0) {
    return { error: "Montant du chèque invalide" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_sale_cheque_details", {
    p_cheque_id: chequeId,
    p_bank_name: details.bankName.trim(),
    p_cheque_number: details.chequeNumber.trim(),
    p_cheque_amount: details.chequeAmount,
    p_drawer_name: details.drawerName?.trim() || null,
    p_issue_date: details.issueDate || null,
    p_notes: details.notes?.trim() || null,
  });

  if (error) return { error: error.message };

  revalidateChequePaths();
  return { success: true };
}

export async function deleteSaleCheque(
  chequeId: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["manager", "directeur", "admin"]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_sale_cheque", {
    p_cheque_id: chequeId,
  });

  if (error) return { error: error.message };

  revalidateChequePaths();
  revalidatePath("/manager/stock");
  revalidatePath("/director/stock");
  return { success: true };
}
