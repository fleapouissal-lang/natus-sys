import type { SaleDocumentData } from "@/components/pos/sale-document-types";
import { saleDocumentNumber } from "@/components/pos/sale-document-types";
import {
  NATUS_BRAND,
  NATUS_BRAND_GRADIENTS,
  NATUS_BRAND_SERIF,
} from "@/lib/constants/natus-brand";
import { NATUS_INVOICE_COMPANY } from "@/lib/constants/company";
import { computeTvaBreakdown, TVA_RATE } from "@/lib/constants/sales";
import { formatCurrency } from "@/lib/utils";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildInvoiceHtml(data: SaleDocumentData): string {
  const invoiceNo = saleDocumentNumber(data.saleId);
  const { ht, tva, ttc } = computeTvaBreakdown(data.total);
  const tvaPercent = Math.round(TVA_RATE * 100);
  const clientName = escapeHtml(data.customerName?.trim() || "Divers");
  const rows = data.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">${formatCurrency(item.unitPrice)}</td>
          <td style="text-align:right">${formatCurrency(item.quantity * item.unitPrice)}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Facture ${invoiceNo}</title>
  <style>
    body { font-family: Georgia, serif; margin: 24px; color: ${NATUS_BRAND.ink}; background: ${NATUS_BRAND_GRADIENTS.creamBg}; }
    h1 { color: ${NATUS_BRAND.goldDeep}; font-weight: 400; margin: 0 0 8px; }
    .meta { font-size: 14px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; background: rgba(255,255,255,0.7); }
    th, td { border: 1px solid #e8dcc8; padding: 8px 10px; }
    th { background: rgba(250,234,161,0.45); text-align: left; }
    .totals { margin-top: 16px; width: 280px; margin-left: auto; font-size: 14px; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .footer { margin-top: 32px; font-size: 11px; color: ${NATUS_BRAND.inkSoft}; text-align: center; }
  </style>
</head>
<body>
  <p style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${NATUS_BRAND.gold}">Facture</p>
  <h1>${escapeHtml(NATUS_INVOICE_COMPANY.legalName)}</h1>
  <div class="meta">
    <div><strong>N° facture :</strong> ${invoiceNo}</div>
    <div><strong>Date :</strong> ${escapeHtml(new Date(data.createdAt).toLocaleString("fr-FR"))}</div>
    <div><strong>Client :</strong> ${clientName}</div>
    ${data.storeName ? `<div><strong>Magasin :</strong> ${escapeHtml(data.storeName)}</div>` : ""}
    ${data.shopifyOrderNumber ? `<div><strong>Commande :</strong> ${escapeHtml(data.shopifyOrderNumber)}</div>` : ""}
  </div>
  <table>
    <thead>
      <tr>
        <th>Article</th>
        <th>Qté</th>
        <th>P.U. TTC</th>
        <th>Total TTC</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div><span>Total HT</span><span>${formatCurrency(ht)}</span></div>
    <div><span>TVA ${tvaPercent} %</span><span>${formatCurrency(tva)}</span></div>
    <div><strong>Total TTC</strong><strong>${formatCurrency(ttc)}</strong></div>
  </div>
  <p class="footer">${escapeHtml(NATUS_INVOICE_COMPANY.legalMention)}</p>
</body>
</html>`;
}

export function downloadInvoiceHtml(data: SaleDocumentData): void {
  const invoiceNo = saleDocumentNumber(data.saleId);
  const html = buildInvoiceHtml(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `facture-${invoiceNo}.html`;
  anchor.click();
  URL.revokeObjectURL(url);
}
