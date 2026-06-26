import type { PaymentMethod } from "@/lib/types";

/** TVA marocaine — prix catalogue TTC */
export const TVA_RATE = 0.2;

/** Libellés caisse — card = terminal TPE */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Espèces",
  card: "TPE",
  cheque: "Chèque",
};

export function paymentMethodLabel(method: PaymentMethod | string): string {
  if (method in PAYMENT_METHOD_LABELS) {
    return PAYMENT_METHOD_LABELS[method as PaymentMethod];
  }
  return method;
}

export function computeTvaBreakdown(ttc: number) {
  const ht = ttc / (1 + TVA_RATE);
  const tva = ttc - ht;
  return { ht, tva, ttc };
}
