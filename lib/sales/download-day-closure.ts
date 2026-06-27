import { NATUS_INVOICE_COMPANY } from "@/lib/constants/company";
import {
  aggregateDayProducts,
  dayClosureReference,
  formatDayClosureDate,
  type DayClosureStats,
} from "@/lib/sales/day-closure";
import { formatCurrency } from "@/lib/utils";
import type { Sale } from "@/lib/types";

export type DayClosureDownloadData = {
  closureId: string;
  dateKey: string;
  storeName: string;
  cashierLabel?: string;
  stats: DayClosureStats;
  sales: Sale[];
  generatedAt?: Date;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function ticketRow(label: string, value: string, bold = false): string {
  const weight = bold ? "900" : "700";
  return `<div style="display:flex;justify-content:space-between;gap:8px;font-size:10px;line-height:1.35;margin:2px 0">
    <span style="font-weight:${weight}">${escapeHtml(label)}</span>
    <span style="font-weight:${bold ? 900 : 700};text-align:right;font-variant-numeric:tabular-nums">${escapeHtml(value)}</span>
  </div>`;
}

const CLOSURE_DOC_STYLES = `
  body { font-family: Arial, sans-serif; margin: 24px; color: #111; background: #f5f5f5; }
  .ticket { max-width: 300px; margin: 0 auto; background: #fff; padding: 12px 8px; border: 1px solid #ddd; }
  .center { text-align: center; }
  .rule { border-top: 1px dashed #111; margin: 8px 0; }
  .rule-heavy { border-top: 2px solid #111; margin: 8px 0; }
  .title { text-align: center; font-size: 11px; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 4px; }
  th, td { border-bottom: 1px solid rgba(0,0,0,0.25); padding: 4px 2px; }
  th { font-weight: 900; text-transform: uppercase; }
  .total-bar { display: flex; justify-content: space-between; align-items: center; border: 2px solid #111; padding: 8px; margin-top: 8px; }
  .footer { text-align: center; font-size: 8px; line-height: 1.4; margin-top: 8px; }
  .signature { margin-top: 12px; padding-top: 8px; font-size: 9px; }
  .sale-items { font-size: 8px; line-height: 1.35; color: #333; padding: 2px 0 4px 4px; }
  .sale-item-line { display: flex; justify-content: space-between; gap: 8px; margin: 1px 0; }
  .sale-item-name { font-weight: 600; min-width: 0; }
  .sale-item-qty { font-weight: 900; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .signature-line { border-bottom: 1px solid #111; margin-top: 20px; }
`;

export function buildDayClosureHtml(data: DayClosureDownloadData): string {
  const generatedAt = data.generatedAt ?? new Date();
  const ref = dayClosureReference(data.dateKey);
  const products = aggregateDayProducts(data.sales);

  const productRows = products
    .map(
      (item) =>
        `<tr>
          <td style="font-weight:700;line-height:1.25">${escapeHtml(item.name)}</td>
          <td style="text-align:center;font-weight:900">${item.quantity}</td>
          <td style="text-align:right;font-weight:600">${formatCurrency(item.unitPrice)}</td>
          <td style="text-align:right;font-weight:900">${formatCurrency(item.total)}</td>
        </tr>`
    )
    .join("");

  const body = `
    <div class="ticket">
      <div class="center">
        <p style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.14em;margin:0">${escapeHtml(NATUS_INVOICE_COMPANY.legalName)}</p>
        <p style="font-size:9px;font-weight:600;line-height:1.3;margin:4px 0 0">${escapeHtml(NATUS_INVOICE_COMPANY.address)}<br />${escapeHtml(NATUS_INVOICE_COMPANY.city)}</p>
        <p style="font-size:9px;font-weight:700;margin:2px 0 0">${escapeHtml(NATUS_INVOICE_COMPANY.phone)}</p>
        <p style="font-size:8px;font-weight:600;margin:0">${escapeHtml(NATUS_INVOICE_COMPANY.taxId)}</p>
      </div>
      <div class="rule-heavy"></div>
      <p class="title">Clôture journalière</p>
      <div class="rule"></div>
      ${ticketRow("N° clôture", ref, true)}
      ${ticketRow("Journée", formatDayClosureDate(data.dateKey))}
      ${data.storeName ? ticketRow("Magasin", data.storeName) : ""}
      ${data.cashierLabel ? ticketRow("Caissier", data.cashierLabel) : ""}
      ${ticketRow(
        "Édité le",
        generatedAt.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
      )}
      <div class="rule-heavy"></div>
      <p class="title" style="margin-bottom:4px">Synthèse du jour</p>
      ${ticketRow("Transactions", String(data.stats.count), true)}
      ${ticketRow("Espèces", formatCurrency(data.stats.cash))}
      ${ticketRow("TPE", formatCurrency(data.stats.card))}
      ${ticketRow("Chèque", formatCurrency(data.stats.cheque))}
      ${
        data.stats.cancelledCount > 0
          ? ticketRow(
              `Annulées (${data.stats.cancelledCount})`,
              formatCurrency(data.stats.cancelledTotal)
            )
          : ""
      }
      <div class="rule-heavy"></div>
      <p class="title" style="margin-bottom:4px">Articles vendus</p>
      <table>
        <thead>
          <tr>
            <th style="text-align:left">Désignation</th>
            <th style="text-align:center;width:28px">Qté</th>
            <th style="text-align:right;width:52px">P.U.</th>
            <th style="text-align:right;width:52px">Total</th>
          </tr>
        </thead>
        <tbody>
          ${
            productRows ||
            `<tr><td colspan="4" style="text-align:center;padding:12px 0;font-size:9px;font-weight:600">Aucun article vendu</td></tr>`
          }
        </tbody>
      </table>
      <div class="rule-heavy"></div>
      <div class="total-bar">
        <span style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.04em">Total CA TTC</span>
        <span style="font-size:18px;font-weight:900;font-variant-numeric:tabular-nums">${formatCurrency(data.stats.total)}</span>
      </div>
      <div class="rule"></div>
      ${ticketRow("Panier moyen", formatCurrency(data.stats.averageTicket))}
      <div class="rule-heavy"></div>
      <p class="footer">${escapeHtml(NATUS_INVOICE_COMPANY.legalMention)}</p>
      <div class="signature">
        <p style="margin:0;font-weight:600">Signature caissier :</p>
        <div class="signature-line"></div>
      </div>
    </div>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Clôture ${ref}</title>
  <style>${CLOSURE_DOC_STYLES}</style>
</head>
<body>${body}</body>
</html>`;
}

function downloadHtmlFile(html: string, filename: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadDayClosureHtml(data: DayClosureDownloadData): void {
  const ref = dayClosureReference(data.dateKey);
  const storeSlug = data.storeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  const suffix = storeSlug ? `-${storeSlug}` : "";
  downloadHtmlFile(buildDayClosureHtml(data), `cloture-${ref}${suffix}.html`);
}

const BULK_DOWNLOAD_GAP_MS = 350;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function downloadDayClosuresHtml(items: DayClosureDownloadData[]): Promise<void> {
  for (let index = 0; index < items.length; index++) {
    downloadDayClosureHtml(items[index]!);
    if (index < items.length - 1) {
      await wait(BULK_DOWNLOAD_GAP_MS);
    }
  }
}
