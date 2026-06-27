import type { SaleDocumentData } from "@/components/pos/sale-document-types";
import { saleDocumentNumber } from "@/components/pos/sale-document-types";
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

function lineUnitHt(unitPriceTtc: number): number {
  return unitPriceTtc / (1 + TVA_RATE);
}

function buildInvoiceBody(data: SaleDocumentData): string {
  const invoiceNo = saleDocumentNumber(data.saleId);
  const { ht, tva, ttc } = computeTvaBreakdown(data.total);
  const tvaPercent = Math.round(TVA_RATE * 100);
  const clientName = escapeHtml(data.customerName?.trim() || "Divers");
  const companyAddress = data.storeName
    ? `${NATUS_INVOICE_COMPANY.address} (${escapeHtml(data.storeName)})`
    : NATUS_INVOICE_COMPANY.address;
  const rows = data.items
    .map((item) => {
      const unitHt = lineUnitHt(item.unitPrice);
      const lineHt = unitHt * item.quantity;
      return `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">${formatCurrency(unitHt)}</td>
          <td style="text-align:right">${formatCurrency(lineHt)}</td>
        </tr>`;
    })
    .join("");

  const discountRows = [
    data.subtotal != null &&
    (data.loyaltyDiscount || data.proClientDiscount || data.promoDiscount)
      ? `<div><span>Sous-total articles</span><span>${formatCurrency(data.subtotal)}</span></div>`
      : "",
    data.loyaltyDiscount
      ? `<div><span>Réduction fidélité</span><span>-${formatCurrency(data.loyaltyDiscount)}</span></div>`
      : "",
    data.proClientDiscount
      ? `<div><span>Remise Client Pro (-34 %)</span><span>-${formatCurrency(data.proClientDiscount)}</span></div>`
      : "",
    data.promoDiscount
      ? `<div><span>Promo ${escapeHtml(data.promoCode ?? "")}</span><span>-${formatCurrency(data.promoDiscount)}</span></div>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  return `
  <header class="invoice-header">
    <div>
      <p class="eyebrow">Facture</p>
      <h2 class="invoice-title">FACTURE</h2>
      <p class="invoice-no"><strong>Facture N°</strong> ${invoiceNo}</p>
    </div>
    <div class="invoice-brand">Natus</div>
  </header>

  <section class="parties">
    <div class="party party-issuer">
      <p class="party-label">Émetteur</p>
      <p class="party-name">${escapeHtml(NATUS_INVOICE_COMPANY.legalName)}</p>
      <p>${escapeHtml(companyAddress)}</p>
      <p>${escapeHtml(NATUS_INVOICE_COMPANY.city)}</p>
      <p>Tél. : ${escapeHtml(NATUS_INVOICE_COMPANY.phone)}</p>
      <p>Email : ${escapeHtml(NATUS_INVOICE_COMPANY.email)}</p>
      <p class="party-meta">${escapeHtml(NATUS_INVOICE_COMPANY.taxId)}</p>
    </div>
    <div class="party party-client">
      ${
        data.shopifyOrderNumber
          ? `<p class="party-ref"><strong>Réf. commande :</strong> ${escapeHtml(data.shopifyOrderNumber)}</p>`
          : ""
      }
      <p class="party-label">Client</p>
      <p class="party-name">${clientName}</p>
      ${data.customerPhone ? `<p>Tél. : ${escapeHtml(data.customerPhone)}</p>` : ""}
      ${data.customerEmail ? `<p>Email : ${escapeHtml(data.customerEmail)}</p>` : ""}
      ${data.customerIce ? `<p>ICE : ${escapeHtml(data.customerIce)}</p>` : ""}
      ${data.loyaltyCardNumber ? `<p>Carte fidélité : ${escapeHtml(data.loyaltyCardNumber)}</p>` : ""}
    </div>
  </section>

  <div class="invoice-lines">
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Qté</th>
          <th>Prix HT</th>
          <th>Total HT</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      ${discountRows}
      <div><span>Total HT</span><span>${formatCurrency(ht)}</span></div>
      <div><span>TVA ${tvaPercent} %</span><span>${formatCurrency(tva)}</span></div>
      <div class="total-ttc"><span>Total TTC</span><strong>${formatCurrency(ttc)}</strong></div>
    </div>
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
      font-family: Georgia, "Times New Roman", serif;
      margin: 0;
      color: #000;
      background: #fff;
      font-size: 13px;
      line-height: 1.45;
    }
    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      padding-bottom: 16px;
      margin-bottom: 20px;
      border-bottom: 1px solid #000;
    }
    .eyebrow {
      margin: 0 0 6px;
      font-size: 11px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #000;
    }
    .invoice-title {
      margin: 0;
      font-size: 2rem;
      font-weight: 400;
      letter-spacing: 0.04em;
      color: #000;
    }
    .invoice-no {
      margin: 10px 0 0;
      color: #000;
    }
    .invoice-brand {
      font-size: 2.2rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      color: #000;
      text-align: right;
    }
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 32px;
      row-gap: 12px;
      margin-bottom: 24px;
      padding-bottom: 18px;
      border-bottom: 1px solid #000;
    }
    .party-label {
      margin: 0 0 8px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #000;
    }
    .party-name {
      margin: 0 0 6px;
      font-size: 15px;
      font-weight: 700;
      color: #000;
    }
    .party p {
      margin: 0 0 4px;
      color: #000;
    }
    .party-meta {
      font-size: 11px;
    }
    .party-ref {
      margin-bottom: 10px !important;
    }
    .party-issuer {
      text-align: left;
      padding-left: 12px;
      border-left: 1px solid #ccc;
    }
    .party-client {
      text-align: right;
      padding-right: 12px;
      border-right: 1px solid #ccc;
    }
    .invoice-lines {
      border: 1px solid #000;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      background: #fff;
    }
    thead { display: table-header-group; }
    tbody tr { page-break-inside: auto; break-inside: auto; }
    th, td {
      border: 1px solid #ccc;
      padding: 8px 10px;
      vertical-align: top;
      color: #000;
    }
    th {
      background: #fff;
      color: #000;
      text-align: left;
      border: 1px solid #000;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    th:nth-child(2) { text-align: center; }
    th:nth-child(3), th:nth-child(4) { text-align: right; }
    .totals {
      width: 100%;
      max-width: 18rem;
      margin-left: auto;
      font-size: 13px;
      page-break-inside: avoid;
      break-inside: avoid;
      border-top: 1px solid #000;
    }
    .totals div {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 8px 14px;
      border-bottom: 1px solid #ccc;
      color: #000;
    }
    .totals .total-ttc {
      background: #fff;
      color: #000;
      border-top: 2px solid #000;
      border-bottom: none;
      font-weight: 700;
    }
    .footer {
      margin-top: 28px;
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
      body {
        background: #fff;
        -webkit-print-color-adjust: economy;
        print-color-adjust: economy;
      }
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
      <p style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#000">Export factures</p>
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
