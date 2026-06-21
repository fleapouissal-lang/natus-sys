/** Coordonnées affichées sur les factures client. */
export const NATUS_INVOICE_COMPANY = {
  legalName: "Natus Cosmétiques",
  brandLine: "Natus Marrakech",
  address: "12 Rue de la Liberté, Guéliz",
  city: "40000 Marrakech, Maroc",
  phone: "+212 5 24 00 00 00",
  email: "contact@natus.ma",
  website: "www.natus.ma",
  /** À compléter si besoin légal */
  taxId: "ICE — — —",
  paymentTerms: ["Paiement comptant en magasin", "Merci de votre confiance"],
  legalMention: `TVA ${Math.round(0.2 * 100)} % incluse — Document généré par la caisse Natus.`,
} as const;

export function invoicePaymentModeLabel(
  method: "cash" | "card",
  customLabel?: string
): string {
  if (customLabel) return customLabel;
  return method === "card" ? "Carte bancaire (TPE)" : "Espèces";
}
