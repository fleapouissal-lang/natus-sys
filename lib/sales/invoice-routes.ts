import type { UserRole } from "@/lib/types";

export function getInvoicesBasePath(role: UserRole): string | null {
  if (role === "cashier") return "/cashier/invoices";
  if (role === "manager") return "/manager/invoices";
  if (role === "directeur" || role === "admin") return "/director/invoices";
  if (role === "hub") return "/hub/invoices";
  return null;
}

export function invoiceDetailPath(basePath: string, saleId: string): string {
  return `${basePath}/${saleId}`;
}
