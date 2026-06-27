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

function buildInvoiceBody(data: SaleDocumentData): string {
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

  return `
  <p style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#000">Facture</p>
  <h1>${escapeHtml(NATUS_INVOICE_COMPANY.legalName)}</h1>
  <div class="meta">
    <div><strong>N° facture :</strong> ${invoiceNo}</div>
    <div><strong>Date :</strong> ${escapeHtml(new Date(data.createdAt).toLocaleString("fr-FR"))}</div>
    <div><strong>Client :</strong> ${clientName}</div>
    ${data.customerPhone ? `<div><strong>Tél. :</strong> ${escapeHtml(data.customerPhone)}</div>` : ""}
    ${data.customerEmail ? `<div><strong>Email :</strong> ${escapeHtml(data.customerEmail)}</div>` : ""}
    ${data.customerIce ? `<div><strong>ICE :</strong> ${escapeHtml(data.customerIce)}</div>` : ""}
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
    <div class="total-ttc"><strong>Total TTC</strong><strong>${formatCurrency(ttc)}</strong></div>
  </div>
  <p class="footer">${escapeHtml(NATUS_INVOICE_COMPANY.legalMention)}</p>`;
}

const INVOICE_DOC_STYLES = `
    @page {
      size: A4 portrait;
      margin: 12mm 10mm 18mm 10mm;
      @bottom-center {
        content: "Page " counter(page) " / " counter(pages);
        font-size: 8pt;
        color: #000;
        font-family: system-ui, sans-serif;
      }
    }
    body {
      font-family: Georgia, serif;
      margin: 0;
      color: #000;
      background: #fff;
    }
    h1 { color: #000; font-weight: 400; margin: 0 0 8px; }
    .meta { font-size: 14px; margin-bottom: 24px; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      background: #fff;
    }
    thead { display: table-header-group; }
    tbody tr { page-break-inside: avoid; break-inside: avoid; }
    th, td { border: 1px solid #ccc; padding: 8px 10px; }
    th {
      background: #000;
      color: #fff;
      text-align: left;
      border-radius: 0;
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .totals {
      margin-top: 16px;
      width: 280px;
      margin-left: auto;
      font-size: 14px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals .total-ttc {
      background: #000;
      color: #fff;
      padding: 10px 12px;
      margin-top: 4px;
      font-weight: 700;
    }
    .footer {
      margin-top: 32px;
      font-size: 11px;
      color: #333;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .invoice-page { page-break-after: always; break-after: page; padding-bottom: 24px; }
    .invoice-page:last-child { page-break-after: auto; break-after: auto; }
    .export-summary {
      margin-bottom: 32px;
      padding: 20px;
      border: 1px solid #ccc;
      background: #fff;
    }
    @media print {
      body { background: #fff; }
      -webkit-print-color-adjust: economy;
      print-color-adjust: economy;
    }`;

export function buildInvoiceHtml(data: SaleDocumentData): string {
  const invoiceNo = saleDocumentNumber(data.saleId);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Facture ${invoiceNo}</title>
  <style>${INVOICE_DOC_STYLES}</style>
</head>
<body>${buildInvoiceBody(data)}</body>
</html>`;
}

export function buildInvoicesCombinedHtml(
  invoices: SaleDocumentData[],
  meta: { scopeLabel: string; exportedAt?: Date }
): string {
  const exportedAt = meta.exportedAt ?? new Date();
  const totalTtc = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const summary = `
    <section class="export-summary">
      <p style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${NATUS_BRAND.gold}">Export factures</p>
      <h1>${escapeHtml(NATUS_INVOICE_COMPANY.legalName)}</h1>
      <div class="meta">
        <div><strong>Périmètre :</strong> ${escapeHtml(meta.scopeLabel)}</div>
        <div><strong>Nombre de factures :</strong> ${invoices.length}</div>
        <div><strong>Total TTC :</strong> ${formatCurrency(totalTtc)}</div>
        <div><strong>Exporté le :</strong> ${escapeHtml(exportedAt.toLocaleString("fr-FR"))}</div>
      </div>
    </section>`;

  const pages = invoices
    .map(
      (invoice) =>
        `<section class="invoice-page">${buildInvoiceBody(invoice)}</section>`
    )
    .join("");

  const dateKey = exportedAt.toISOString().slice(0, 10);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Export factures ${dateKey}</title>
  <style>${INVOICE_DOC_STYLES}</style>
</head>
<body>${summary}${pages}</body>
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

export function downloadInvoiceHtml(data: SaleDocumentData): void {
  const invoiceNo = saleDocumentNumber(data.saleId);
  downloadHtmlFile(buildInvoiceHtml(data), `facture-${invoiceNo}.html`);
}

const BULK_DOWNLOAD_GAP_MS = 350;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Télécharge chaque facture dans son propre fichier HTML (comme le bouton ligne). */
export async function downloadInvoicesHtml(invoices: SaleDocumentData[]): Promise<void> {
  for (let index = 0; index < invoices.length; index++) {
    downloadInvoiceHtml(invoices[index]!);
    if (index < invoices.length - 1) {
      await wait(BULK_DOWNLOAD_GAP_MS);
    }
  }
}

export function downloadInvoicesCombinedHtml(
  invoices: SaleDocumentData[],
  meta: { scopeLabel: string }
): void {
  if (invoices.length === 0) return;
  const dateKey = new Date().toISOString().slice(0, 10);
  const filename =
    invoices.length === 1
      ? `facture-${saleDocumentNumber(invoices[0].saleId)}.html`
      : `factures-${dateKey}-${invoices.length}.html`;
  downloadHtmlFile(buildInvoicesCombinedHtml(invoices, meta), filename);
}

export function printInvoicesCombinedHtml(
  invoices: SaleDocumentData[],
  meta: { scopeLabel: string }
): void {
  if (invoices.length === 0) return;
  const html = buildInvoicesCombinedHtml(invoices, meta);
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
  };
}
