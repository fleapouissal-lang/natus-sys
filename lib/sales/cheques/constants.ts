import type { SaleChequeStatus } from "@/lib/sales/cheques/types";

export const CHEQUE_EDIT_WINDOW_MINUTES = 30;

export const CHEQUE_STATUS_OPTIONS: {
  value: SaleChequeStatus;
  label: string;
  description: string;
}[] = [
  {
    value: "pending",
    label: "Non traité",
    description: "Chèque enregistré, pas encore déposé",
  },
  {
    value: "deposited",
    label: "En banque",
    description: "Chèque remis à la banque",
  },
  {
    value: "received",
    label: "Montant reçu",
    description: "Encaissement confirmé",
  },
  {
    value: "rejected",
    label: "Rejeté",
    description: "Chèque refusé ou impayé",
  },
];

export function getChequeStatusLabel(status: SaleChequeStatus): string {
  return CHEQUE_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function getChequeStatusVariant(
  status: SaleChequeStatus
): "default" | "success" | "warning" | "danger" | "accent" {
  switch (status) {
    case "received":
      return "success";
    case "deposited":
      return "accent";
    case "rejected":
      return "danger";
    default:
      return "warning";
  }
}
