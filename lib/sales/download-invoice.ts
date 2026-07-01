import type { SaleDocumentData } from "@/components/pos/sale-document-types";
import { saleDocumentNumber } from "@/components/pos/sale-document-types";
import {
  invoicePaymentModeLabel,
  NATUS_INVOICE_COMPANY,
} from "@/lib/constants/company";
import { INVOICE_CLIENT_DIVERS } from "@/lib/constants/invoice";
import {
  NATUS_BRAND,
  NATUS_BRAND_GRADIENTS,
  NATUS_BRAND_SERIF,
} from "@/lib/constants/natus-brand";
import { computeTvaBreakdown, PAYMENT_METHOD_LABELS, TVA_RATE } from "@/lib/constants/sales";
import {
  A4_DOC_PREVIEW_CSS,
  A4_PAGE_CSS,
  buildDocToolbar,
  PRINT_TABLE_PAGINATION_CSS,
} from "@/lib/print/document-styles";
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
  const invoiceNo = saleDocumentNumber(data.saleId, data.invoiceNumber);
  const { ht, tva, ttc } = computeTvaBreakdown(data.total);
  const tvaPercent = Math.round(TVA_RATE * 100);
  const clientName = escapeHtml(data.customerName?.trim() || INVOICE_CLIENT_DIVERS);
  const companyAddress = data.storeName
    ? `${NATUS_INVOICE_COMPANY.address} (${escapeHtml(data.storeName)})`
    : NATUS_INVOICE_COMPANY.address;
  const paymentLabel = escapeHtml(
    data.paymentLabel ??
      invoicePaymentModeLabel(
        data.paymentMethod,
        PAYMENT_METHOD_LABELS[data.paymentMethod]
      )
  );

  const rows = data.items
    .map((item, i) => {
      const unitHt = lineUnitHt(item.unitPrice);
      const lineHt = unitHt * item.quantity;
      const rowBg =
        i % 2 === 0 ? "rgba(255,253,249,0.92)" : "rgba(255,246,236,0.65)";
      return `
        <tr style="border-color:${NATUS_BRAND.borderSoft};background:${rowBg};color:${NATUS_BRAND.ink}">
          <td class="col-desc">${escapeHtml(item.name)}</td>
          <td class="col-qty">${item.quantity}</td>
          <td class="col-price">${formatCurrency(unitHt)}</td>
          <td class="col-total">${formatCurrency(lineHt)}</td>
        </tr>`;
    })
    .join("");

  const discountRows = [
    data.subtotal != null &&
    (data.loyaltyDiscount || data.proClientDiscount || data.promoDiscount)
      ? `<div class="totals-row" style="border-color:${NATUS_BRAND.borderSoft};color:${NATUS_BRAND.inkSoft}">
          <span>Sous-total articles</span>
          <span>${formatCurrency(data.subtotal)}</span>
        </div>`
      : "",
    data.loyaltyDiscount
      ? `<div class="totals-row" style="border-color:${NATUS_BRAND.borderSoft};color:${NATUS_BRAND.inkSoft}">
          <span>Réduction fidélité</span>
          <span>-${formatCurrency(data.loyaltyDiscount)}</span>
        </div>`
      : "",
    data.proClientDiscount
      ? `<div class="totals-row" style="border-color:${NATUS_BRAND.borderSoft};color:${NATUS_BRAND.inkSoft}">
          <span>Remise Client Pro (-34 %)</span>
          <span>-${formatCurrency(data.proClientDiscount)}</span>
        </div>`
      : "",
    data.promoDiscount
      ? `<div class="totals-row" style="border-color:${NATUS_BRAND.borderSoft};color:${NATUS_BRAND.inkSoft}">
          <span>Promo ${escapeHtml(data.promoCode ?? "")}</span>
          <span>-${formatCurrency(data.promoDiscount)}</span>
        </div>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  return `
  <div class="natus-invoice" style="background:${NATUS_BRAND_GRADIENTS.creamBg};color:${NATUS_BRAND.ink}">
    <div class="natus-invoice-sheet" style="background:${NATUS_BRAND_GRADIENTS.creamBg}">
      <span class="natus-invoice-monogram" aria-hidden="true">N</span>

      <div class="natus-invoice-print-header">
        <div class="natus-invoice-header" style="border-color:${NATUS_BRAND.border}">
          <div class="natus-invoice-header-main">
            <h1 style="font-family:${NATUS_BRAND_SERIF};color:${NATUS_BRAND.gold}">FACTURE</h1>
            <p class="natus-invoice-number" style="color:${NATUS_BRAND.inkSoft}">
              <span style="color:${NATUS_BRAND.goldDeep}">Facture N°</span>
              <span class="natus-invoice-number-value" style="color:${NATUS_BRAND.ink}">${invoiceNo}</span>
            </p>
          </div>
          <div class="natus-invoice-logo" aria-hidden="true">
            <span class="natus-invoice-logo-text" style="font-family:${NATUS_BRAND_SERIF};color:${NATUS_BRAND.gold}">Natus</span>
          </div>
        </div>

        <div class="natus-invoice-parties" style="border-color:${NATUS_BRAND.border}">
          <div class="natus-invoice-party-issuer">
            <div class="natus-invoice-party-accent natus-invoice-party-accent--left" style="background:linear-gradient(180deg, transparent, ${NATUS_BRAND.gold} 12%, ${NATUS_BRAND.gold} 88%, transparent)"></div>
            <p class="natus-invoice-section-label" style="font-family:${NATUS_BRAND_SERIF};color:${NATUS_BRAND.gold}">Émetteur</p>
            <div class="natus-invoice-party-body" style="color:${NATUS_BRAND.inkSoft}">
              <p class="natus-invoice-party-name" style="color:${NATUS_BRAND.ink}">${escapeHtml(NATUS_INVOICE_COMPANY.legalName)}</p>
              <p>${escapeHtml(companyAddress)}</p>
              <p>${escapeHtml(NATUS_INVOICE_COMPANY.city)}</p>
              <p class="natus-invoice-party-gap">Tél. : ${escapeHtml(NATUS_INVOICE_COMPANY.phone)}</p>
              <p>Email : ${escapeHtml(NATUS_INVOICE_COMPANY.email)}</p>
              <p class="natus-invoice-party-meta" style="color:${NATUS_BRAND.goldDeep}">${escapeHtml(NATUS_INVOICE_COMPANY.taxId)}</p>
            </div>
          </div>

          <div class="natus-invoice-party-client">
            <div class="natus-invoice-party-accent natus-invoice-party-accent--right" style="background:linear-gradient(180deg, transparent, ${NATUS_BRAND.gold} 12%, ${NATUS_BRAND.gold} 88%, transparent)"></div>
            ${
              data.shopifyOrderNumber
                ? `<p class="natus-invoice-order-ref" style="color:${NATUS_BRAND.inkSoft}">
                    <span style="color:${NATUS_BRAND.goldDeep}">Réf. commande : </span>
                    <span style="color:${NATUS_BRAND.ink}">${escapeHtml(data.shopifyOrderNumber)}</span>
                  </p>`
                : ""
            }
            <p class="natus-invoice-section-label" style="font-family:${NATUS_BRAND_SERIF};color:${NATUS_BRAND.gold}">Client</p>
            <p class="natus-invoice-party-name" style="color:${NATUS_BRAND.ink}">${clientName}</p>
            ${data.customerPhone ? `<p style="color:${NATUS_BRAND.inkSoft}">Tél. : ${escapeHtml(data.customerPhone)}</p>` : ""}
            ${data.customerEmail ? `<p style="color:${NATUS_BRAND.inkSoft}">Email : ${escapeHtml(data.customerEmail)}</p>` : ""}
            ${data.customerIce ? `<p style="color:${NATUS_BRAND.inkSoft}">ICE : ${escapeHtml(data.customerIce)}</p>` : ""}
            ${data.loyaltyCardNumber ? `<p style="color:${NATUS_BRAND.inkSoft}">Carte fidélité : ${escapeHtml(data.loyaltyCardNumber)}</p>` : ""}
          </div>
        </div>
      </div>

      <div class="natus-invoice-body">
        <div class="natus-invoice-table-wrap">
          <table class="natus-invoice-table natus-print-table">
            <colgroup>
              <col class="col-desc" />
              <col class="col-qty" />
              <col class="col-price" />
              <col class="col-total" />
            </colgroup>
            <thead>
              <tr class="natus-print-doc-banner">
                <th colspan="4">Facture N° ${invoiceNo} — ${escapeHtml(NATUS_INVOICE_COMPANY.legalName)}</th>
              </tr>
              <tr>
                <th>Description</th>
                <th>Qté</th>
                <th>Prix HT</th>
                <th>Total HT</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <div class="natus-invoice-totals" style="border-color:${NATUS_BRAND.borderSoft}">
          <div class="natus-invoice-totals-inner">
            ${discountRows}
            <div class="totals-row totals-row--plain" style="background:rgba(255,253,249,0.95);color:${NATUS_BRAND.inkSoft}">
              <span class="totals-label-medium">Total HT :</span>
              <span>${formatCurrency(ht)}</span>
            </div>
            <div class="totals-row totals-row--plain" style="background:rgba(255,253,249,0.95);color:${NATUS_BRAND.inkSoft}">
              <span>TVA (${tvaPercent} %) :</span>
              <span>${formatCurrency(tva)}</span>
            </div>
            <div class="natus-invoice-total-bar" style="background:#2c2418">
              <span>Total TTC :</span>
              <span class="natus-invoice-total-ttc">${formatCurrency(ttc)}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="natus-invoice-footer" style="border-color:${NATUS_BRAND.border}">
        <div style="color:${NATUS_BRAND.inkSoft}">
          <p class="natus-invoice-payment" style="color:${NATUS_BRAND.ink}">Mode de paiement : ${paymentLabel.toUpperCase()}</p>
          <p class="natus-invoice-cashier">Caissier : ${escapeHtml(data.cashierName)}</p>
          <p class="natus-invoice-legal" style="color:${NATUS_BRAND.goldDeep}">${escapeHtml(NATUS_INVOICE_COMPANY.legalMention)}</p>
        </div>
      </div>
    </div>
  </div>`;
}

const INVOICE_DOC_STYLES = `
    ${A4_PAGE_CSS}
    ${PRINT_TABLE_PAGINATION_CSS}

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: ${NATUS_BRAND_SERIF};
      font-size: 14px;
      line-height: 1.45;
      color: ${NATUS_BRAND.ink};
      background: ${NATUS_BRAND_GRADIENTS.creamBg};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .natus-invoice {
      max-width: 210mm;
      margin: 0 auto;
    }

    .natus-invoice-sheet {
      position: relative;
      overflow: hidden;
      padding: 32px;
    }

    .natus-invoice-monogram {
      position: absolute;
      bottom: -6%;
      right: -2%;
      font-family: ${NATUS_BRAND_SERIF};
      font-size: 22rem;
      font-weight: 700;
      color: ${NATUS_BRAND.gold};
      opacity: 0.09;
      line-height: 0.78;
      pointer-events: none;
      user-select: none;
    }

    .natus-invoice-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
      margin: 8px 0 24px;
      padding: 16px 0 20px;
      border-bottom: 1px solid ${NATUS_BRAND.border};
    }

    .natus-invoice-header h1 {
      margin: 0;
      font-size: 2.35rem;
      font-weight: 400;
      letter-spacing: 0.04em;
      line-height: 1;
    }

    .natus-invoice-number {
      margin: 10px 0 0;
      font-size: 16px;
    }

    .natus-invoice-number-value {
      font-size: 18px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    .natus-invoice-logo {
      flex-shrink: 0;
      text-align: right;
    }

    .natus-invoice-logo-text {
      font-size: 2.5rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      line-height: 1;
    }

    .natus-invoice-parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 40px;
      row-gap: 32px;
      margin-bottom: 32px;
      padding-bottom: 32px;
      border-bottom: 1px solid ${NATUS_BRAND.border};
    }

    .natus-invoice-party-issuer,
    .natus-invoice-party-client {
      position: relative;
    }

    .natus-invoice-party-issuer {
      padding-left: 16px;
      text-align: left;
    }

    .natus-invoice-party-client {
      padding-right: 16px;
      text-align: right;
    }

    .natus-invoice-party-accent {
      position: absolute;
      top: 8px;
      bottom: 8px;
      width: 1px;
      opacity: 0.55;
    }

    .natus-invoice-party-accent--left { left: 0; }
    .natus-invoice-party-accent--right { right: 0; }

    .natus-invoice-section-label {
      margin: 0 0 8px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.2em;
      text-transform: uppercase;
    }

    .natus-invoice-party-body p,
    .natus-invoice-party-client p {
      margin: 0 0 4px;
      font-size: 14px;
    }

    .natus-invoice-party-name {
      font-size: 16px !important;
      font-weight: 700;
      margin-bottom: 6px !important;
    }

    .natus-invoice-party-gap { padding-top: 4px; }
    .natus-invoice-party-meta { font-size: 12px !important; }
    .natus-invoice-order-ref { margin: 0 0 12px !important; font-size: 14px; }

    .natus-invoice-table-wrap {
      width: 100%;
      overflow: visible;
    }

    .natus-invoice-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 14px;
    }

    .natus-invoice-table col.col-desc { width: 44%; }
    .natus-invoice-table col.col-qty { width: 12%; }
    .natus-invoice-table col.col-price { width: 22%; }
    .natus-invoice-table col.col-total { width: 22%; }

    .natus-invoice-table thead { display: table-header-group; }

    .natus-invoice-table th {
      padding: 12px 8px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      text-align: left;
      background: #2c2418;
      color: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .natus-invoice-table th:nth-child(2) { text-align: center; }
    .natus-invoice-table th:nth-child(3),
    .natus-invoice-table th:nth-child(4) { text-align: right; }

    .natus-invoice-table td {
      padding: 14px 8px;
      vertical-align: top;
      border-bottom: 1px solid ${NATUS_BRAND.borderSoft};
      word-break: break-word;
    }

    .natus-invoice-table td.col-desc { padding-left: 12px; font-weight: 500; }
    .natus-invoice-table td.col-qty { text-align: center; font-variant-numeric: tabular-nums; }
    .natus-invoice-table td.col-price,
    .natus-invoice-table td.col-total {
      text-align: right;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    .natus-invoice-table td.col-total { font-weight: 600; }
    .natus-invoice-table tbody tr:last-child td { border-bottom: none; }

    .natus-invoice-totals {
      margin-top: 0;
      overflow: hidden;
      border: 1px solid ${NATUS_BRAND.borderSoft};
      border-top: none;
    }

    .natus-invoice-totals-inner {
      margin-left: auto;
      width: 100%;
      max-width: 24rem;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 8px 16px;
      border-bottom: 1px solid ${NATUS_BRAND.borderSoft};
      font-size: 14px;
      font-variant-numeric: tabular-nums;
    }

    .totals-label-medium { font-weight: 500; }

    .natus-invoice-total-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      background: #2c2418;
      color: #fff;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .natus-invoice-total-bar > span:first-child {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .natus-invoice-total-ttc {
      font-size: 20px;
      font-weight: 700;
    }

    .natus-invoice-footer {
      margin-top: 40px;
      padding-top: 32px;
      border-top: 1px solid ${NATUS_BRAND.border};
    }

    .natus-invoice-payment {
      margin: 0;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .natus-invoice-cashier {
      margin: 8px 0 0;
      font-size: 14px;
    }

    .natus-invoice-legal {
      margin: 16px 0 0;
      font-size: 11px;
      line-height: 1.6;
    }

    .natus-invoice-brand-bar {
      margin-top: 32px;
      padding: 12px;
      text-align: center;
      color: #fff;
      font-size: 14px;
      font-weight: 500;
    }

    .invoice-page {
      page-break-after: always;
      break-after: page;
      padding-bottom: 24px;
    }

    .invoice-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    .export-summary {
      max-width: 210mm;
      margin: 0 auto 32px;
      padding: 24px 32px;
      border: 1px solid ${NATUS_BRAND.border};
      background: ${NATUS_BRAND.creamSoft};
      color: ${NATUS_BRAND.ink};
    }

    .export-summary h1 {
      margin: 8px 0 16px;
      font-size: 1.5rem;
      font-weight: 400;
      color: ${NATUS_BRAND.gold};
    }

    .export-summary .meta div {
      margin-bottom: 6px;
      font-size: 14px;
      color: ${NATUS_BRAND.inkSoft};
    }

    @media print {
      @page { size: A4 portrait; margin: 0; }

      html, body {
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      /* On conserve le design (crème, doré, en-tête foncé, filigrane). */
      .natus-invoice,
      .natus-invoice-sheet,
      .natus-invoice *,
      .export-summary,
      .export-summary * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        box-shadow: none !important;
        text-shadow: none !important;
      }

      .natus-invoice-sheet { padding: 16mm 14mm !important; }

      .natus-invoice-print-header {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      .natus-invoice-body {
        break-inside: auto !important;
        page-break-inside: auto !important;
      }

      .natus-invoice-parties {
        break-after: avoid-page;
        page-break-after: avoid;
      }

      .natus-invoice-table thead { display: table-header-group !important; }

      .natus-invoice-table tbody tr {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .natus-invoice-totals,
      .natus-invoice-footer,
      .natus-invoice-brand-bar {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
    }

    ${A4_DOC_PREVIEW_CSS}`;

export function buildInvoiceHtml(data: SaleDocumentData): string {
  const invoiceNo = saleDocumentNumber(data.saleId, data.invoiceNumber);
  const toolbar = buildDocToolbar(`Facture N° ${escapeHtml(invoiceNo)}`);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Facture ${invoiceNo}</title>
  <style>${INVOICE_DOC_STYLES}</style>
</head>
<body>${toolbar}${buildInvoiceBody(data)}</body>
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
      <p class="natus-invoice-section-label" style="font-family:${NATUS_BRAND_SERIF};color:${NATUS_BRAND.gold}">Export factures</p>
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
  const toolbar = buildDocToolbar(
    `${invoices.length} facture${invoices.length !== 1 ? "s" : ""}`
  );

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Export factures ${dateKey}</title>
  <style>${INVOICE_DOC_STYLES}</style>
</head>
<body>${toolbar}${summary}${pages}</body>
</html>`;
}

const AUTO_PRINT_SCRIPT =
  '<script>window.addEventListener("load",function(){setTimeout(function(){window.focus();window.print();},350);});</script>';

function openHtmlPrintWindow(html: string, autoPrint = false) {
  const markup = autoPrint
    ? html.replace("</body>", `${AUTO_PRINT_SCRIPT}</body>`)
    : html;
  const docWindow = window.open("", "_blank");
  if (!docWindow) return;
  docWindow.document.write(markup);
  docWindow.document.close();
  docWindow.focus();
}

/** Aperçu A4 de la facture (sans lancer l'impression). */
export function viewInvoiceHtml(data: SaleDocumentData): void {
  openHtmlPrintWindow(buildInvoiceHtml(data));
}

/** Ouvre la facture et lance directement l'impression / « Enregistrer en PDF ». */
export function printInvoiceHtml(data: SaleDocumentData): void {
  openHtmlPrintWindow(buildInvoiceHtml(data), true);
}

/** « Télécharger » = impression navigateur → « Enregistrer en PDF » (vrai PDF net). */
export function downloadInvoiceHtml(data: SaleDocumentData): void {
  printInvoiceHtml(data);
}

/** Impression groupée : un seul document A4 multi-pages → « Enregistrer en PDF ». */
export async function downloadInvoicesHtml(invoices: SaleDocumentData[]): Promise<void> {
  if (invoices.length === 0) return;
  printInvoicesCombinedHtml(invoices, { scopeLabel: "" });
}

export function downloadInvoicesCombinedHtml(
  invoices: SaleDocumentData[],
  meta: { scopeLabel: string }
): void {
  printInvoicesCombinedHtml(invoices, meta);
}

export function printInvoicesCombinedHtml(
  invoices: SaleDocumentData[],
  meta: { scopeLabel: string }
): void {
  if (invoices.length === 0) return;
  openHtmlPrintWindow(buildInvoicesCombinedHtml(invoices, meta), true);
}
