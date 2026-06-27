import { isDirector } from "@/lib/permissions";
import { CHEQUE_EDIT_WINDOW_MINUTES } from "@/lib/sales/cheques/constants";
import type { SaleChequeRow } from "@/lib/sales/cheques/types";
import type { Profile } from "@/lib/types";

export function chequeEditWindowMs(): number {
  return CHEQUE_EDIT_WINDOW_MINUTES * 60 * 1000;
}

export function minutesUntilChequeEditExpires(createdAt: string, now = Date.now()): number {
  const expiresAt = new Date(createdAt).getTime() + chequeEditWindowMs();
  return Math.max(0, Math.ceil((expiresAt - now) / 60000));
}

export function canCashierEditCheque(
  cheque: Pick<SaleChequeRow, "created_at" | "created_by" | "sale">,
  profile: Pick<Profile, "id">,
  now = Date.now()
): boolean {
  if (cheque.sale?.cancelled_at) return false;
  if (cheque.created_by !== profile.id) return false;
  return now - new Date(cheque.created_at).getTime() <= chequeEditWindowMs();
}

export function canDirectorEditCheque(profile: Pick<Profile, "role">): boolean {
  return isDirector(profile);
}

export function canEditChequeDetails(
  cheque: SaleChequeRow,
  profile: Pick<Profile, "id" | "role">,
  now = Date.now()
): boolean {
  if (cheque.sale?.cancelled_at) return false;
  if (canDirectorEditCheque(profile)) return true;
  if (profile.role === "cashier") {
    return canCashierEditCheque(cheque, profile, now);
  }
  return false;
}

export function canDeleteCheque(
  cheque: SaleChequeRow,
  profile: Pick<Profile, "id" | "role">,
  now = Date.now()
): boolean {
  return canEditChequeDetails(cheque, profile, now);
}

export function canUpdateChequeStatus(profile: Pick<Profile, "role">): boolean {
  return profile.role === "manager" || isDirector(profile);
}
