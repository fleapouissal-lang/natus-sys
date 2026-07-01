import { NATUS_INVOICE_COMPANY } from "@/lib/constants/company";
import {
  NATUS_BRAND,
  NATUS_BRAND_GRADIENTS,
  NATUS_BRAND_SERIF,
} from "@/lib/constants/natus-brand";
import {
  A4_PAGE_CSS,
  PRINT_A4_MEDIA_CSS,
  PRINT_TABLE_PAGINATION_CSS,
} from "@/lib/print/document-styles";
import type { ReceivedTransferRow } from "@/lib/stock-transfers/received-transfer-rows";
import { formatTransferOrderNumber } from "@/lib/stock-transfers/source-order-history";
import { formatDate } from "@/lib/utils";

export type BonCommandeItem = {
  name: string;
  barcode: string;
  code?: string | null;
  quantity: number;
};

export type BonCommandeData = {
  orderNumber: string;
  fromName: string;
  toName: string;
  creatorName?: string | null;
  statusLabel: string;
  createdAt?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  receivedAt?: string | null;
  receiverName?: string | null;
  notes?: string | null;
  items: BonCommandeItem[];
  totalUnits: number;
};

export type TransferDocumentKind = "commande" | "livraison";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Construit les données du bon de commande à partir d'une ligne de transfert. */
export function buildBonCommandeData(
  row: ReceivedTransferRow,
  statusLabel: string
): BonCommandeData {
  const transfer = row.transfer;
  return {
    orderNumber: formatTransferOrderNumber(transfer.id),
    fromName: transfer.from_store_name || "—",
    toName: transfer.to_store_name || "—",
    creatorName: transfer.creator_name ?? null,
    statusLabel,
    createdAt: transfer.created_at || transfer.sent_at || null,
    sentAt: transfer.sent_at || null,
    deliveredAt:
      "delivered_at" in transfer
        ? (transfer as { delivered_at?: string | null }).delivered_at ?? null
        : null,
    receivedAt:
      "received_at" in transfer
        ? (transfer as { received_at?: string | null }).received_at ?? null
        : null,
    receiverName: transfer.receiver_name ?? null,
    notes: transfer.notes ?? null,
    totalUnits: transfer.total_units,
    items: transfer.items.map((item) => ({
      name: item.product_name,
      barcode: item.product_barcode || "",
      code:
        "product_code" in item
          ? (item as { product_code?: string | null }).product_code ?? null
          : null,
      quantity: item.quantity,
    })),
  };
}

function buildTransferDocBody(
  data: BonCommandeData,
  kind: TransferDocumentKind
): string {
  const isLivraison = kind === "livraison";
  const title = isLivraison ? "BON DE LIVRAISON" : "BON DE COMMANDE";
  const numberLabel = isLivraison ? "Livraison N°" : "Commande N°";
  const docLabel = isLivraison ? "Bon de livraison" : "Bon de commande";
  const qtyLabel = isLivraison ? "Qté livrée" : "Quantité";
  const destinationLabel = isLivraison ? "Livré à" : "Destination";

  const rows = data.items
    .map((item, i) => {
      const rowBg =
        i % 2 === 0 ? "rgba(255,253,249,0.92)" : "rgba(255,246,236,0.65)";
      return `
        <tr style="border-color:${NATUS_BRAND.borderSoft};background:${rowBg};color:${NATUS_BRAND.ink}">
          <td class="col-desc">${escapeHtml(item.name)}</td>
          <td class="col-code">${escapeHtml(item.barcode || item.code || "—")}</td>
          <td class="col-qty">${item.quantity}</td>
        </tr>`;
    })
    .join("");

  const sourceMeta = isLivraison
    ? [
        data.sentAt ? `<p class="natus-invoice-party-gap">Expédiée le ${escapeHtml(formatDate(data.sentAt))}</p>` : "",
        data.deliveredAt ? `<p>Livrée le ${escapeHtml(formatDate(data.deliveredAt))}</p>` : "",
      ]
        .filter(Boolean)
        .join("")
    : [
        data.creatorName ? `<p>Établie par ${escapeHtml(data.creatorName)}</p>` : "",
        data.createdAt ? `<p class="natus-invoice-party-gap">Créée le ${escapeHtml(formatDate(data.createdAt))}</p>` : "",
        data.sentAt ? `<p>Envoyée le ${escapeHtml(formatDate(data.sentAt))}</p>` : "",
      ]
        .filter(Boolean)
        .join("");

  const destinationMeta = isLivraison
    ? [
        data.receivedAt ? `<p style="margin-top:4px">Reçue le ${escapeHtml(formatDate(data.receivedAt))}</p>` : "",
        data.receiverName ? `<p>Reçue par ${escapeHtml(data.receiverName)}</p>` : "",
      ]
        .filter(Boolean)
        .join("")
    : "";

  return `
  <div class="natus-invoice" style="background:${NATUS_BRAND_GRADIENTS.creamBg};color:${NATUS_BRAND.ink}">
    <div class="natus-invoice-sheet" style="background:${NATUS_BRAND_GRADIENTS.creamBg}">
      <span class="natus-invoice-monogram" aria-hidden="true">N</span>

      <div class="natus-invoice-print-header">
        <div class="natus-invoice-header" style="border-color:${NATUS_BRAND.border}">
          <div class="natus-invoice-header-main">
            <h1 style="font-family:${NATUS_BRAND_SERIF};color:${NATUS_BRAND.gold}">${title}</h1>
            <p class="natus-invoice-number" style="color:${NATUS_BRAND.inkSoft}">
              <span style="color:${NATUS_BRAND.goldDeep}">${numberLabel}</span>
              <span class="natus-invoice-number-value" style="color:${NATUS_BRAND.ink}">${escapeHtml(data.orderNumber)}</span>
            </p>
            <p class="natus-invoice-number" style="color:${NATUS_BRAND.inkSoft};margin-top:4px">
              <span style="color:${NATUS_BRAND.goldDeep}">Statut : </span>
              <span style="color:${NATUS_BRAND.ink}">${escapeHtml(data.statusLabel)}</span>
            </p>
          </div>
          <div class="natus-invoice-logo" aria-hidden="true">
            <span class="natus-invoice-logo-text" style="font-family:${NATUS_BRAND_SERIF};color:${NATUS_BRAND.gold}">Natus</span>
          </div>
        </div>

        <div class="natus-invoice-parties" style="border-color:${NATUS_BRAND.border}">
          <div class="natus-invoice-party-issuer">
            <div class="natus-invoice-party-accent natus-invoice-party-accent--left" style="background:linear-gradient(180deg, transparent, ${NATUS_BRAND.gold} 12%, ${NATUS_BRAND.gold} 88%, transparent)"></div>
            <p class="natus-invoice-section-label" style="font-family:${NATUS_BRAND_SERIF};color:${NATUS_BRAND.gold}">Source</p>
            <div class="natus-invoice-party-body" style="color:${NATUS_BRAND.inkSoft}">
              <p class="natus-invoice-party-name" style="color:${NATUS_BRAND.ink}">${escapeHtml(data.fromName)}</p>
              ${sourceMeta}
            </div>
          </div>

          <div class="natus-invoice-party-client">
            <div class="natus-invoice-party-accent natus-invoice-party-accent--right" style="background:linear-gradient(180deg, transparent, ${NATUS_BRAND.gold} 12%, ${NATUS_BRAND.gold} 88%, transparent)"></div>
            <p class="natus-invoice-section-label" style="font-family:${NATUS_BRAND_SERIF};color:${NATUS_BRAND.gold}">${destinationLabel}</p>
            <p class="natus-invoice-party-name" style="color:${NATUS_BRAND.ink}">${escapeHtml(data.toName)}</p>
            ${destinationMeta}
          </div>
        </div>
      </div>

      <div class="natus-invoice-body">
        <div class="natus-invoice-table-wrap">
          <table class="natus-invoice-table natus-print-table">
            <colgroup>
              <col class="col-desc" />
              <col class="col-code" />
              <col class="col-qty" />
            </colgroup>
            <thead>
              <tr class="natus-print-doc-banner">
                <th colspan="3">${docLabel} N° ${escapeHtml(data.orderNumber)} — ${escapeHtml(NATUS_INVOICE_COMPANY.legalName)}</th>
              </tr>
              <tr>
                <th>Produit</th>
                <th>Code-barres</th>
                <th>${qtyLabel}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <div class="natus-invoice-totals" style="border-color:${NATUS_BRAND.borderSoft}">
          <div class="natus-invoice-totals-inner">
            <div class="natus-invoice-total-bar" style="background:#2c2418">
              <span>${isLivraison ? "Total livré :" : "Total unités :"}</span>
              <span class="natus-invoice-total-ttc">${data.totalUnits}</span>
            </div>
          </div>
        </div>
      </div>

      ${
        data.notes
          ? `<div class="natus-bon-notes" style="border-color:${NATUS_BRAND.border};color:${NATUS_BRAND.inkSoft}">
              <p class="natus-invoice-section-label" style="font-family:${NATUS_BRAND_SERIF};color:${NATUS_BRAND.gold}">Notes</p>
              <p>${escapeHtml(data.notes)}</p>
            </div>`
          : ""
      }

      ${
        isLivraison
          ? `<div class="natus-bon-signatures">
              <div class="natus-bon-signature">
                <p class="natus-invoice-section-label" style="font-family:${NATUS_BRAND_SERIF};color:${NATUS_BRAND.gold}">Signature expéditeur</p>
                <div class="natus-bon-signature-line" style="border-color:${NATUS_BRAND.border}"></div>
              </div>
              <div class="natus-bon-signature">
                <p class="natus-invoice-section-label" style="font-family:${NATUS_BRAND_SERIF};color:${NATUS_BRAND.gold}">Signature réception</p>
                <div class="natus-bon-signature-line" style="border-color:${NATUS_BRAND.border}"></div>
              </div>
            </div>`
          : ""
      }

      <div class="natus-invoice-footer" style="border-color:${NATUS_BRAND.border}">
        <div style="color:${NATUS_BRAND.inkSoft}">
          <p class="natus-invoice-cashier">${escapeHtml(NATUS_INVOICE_COMPANY.legalName)}</p>
          <p class="natus-invoice-legal" style="color:${NATUS_BRAND.goldDeep}">Document de transfert de stock — généré par Natus.</p>
        </div>
      </div>
    </div>
  </div>`;
}

const BON_COMMANDE_STYLES = `
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

    .natus-invoice { max-width: 210mm; margin: 0 auto; }

    .natus-invoice-sheet { position: relative; overflow: hidden; padding: 32px; }

    /* Barre d'action (écran uniquement) */
    .natus-doc-toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 20px;
      background: rgba(44, 36, 24, 0.96);
      color: #fff;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
    }

    .natus-doc-toolbar span {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      letter-spacing: 0.02em;
      opacity: 0.9;
    }

    .natus-doc-toolbar button {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      border-radius: 8px;
      padding: 9px 16px;
      background: ${NATUS_BRAND.gold};
      color: #fff;
      transition: background 0.15s ease;
    }

    .natus-doc-toolbar button:hover { background: ${NATUS_BRAND.goldDeep}; }

    /* Aperçu A4 à l'écran : feuille centrée sur fond gris, comme un PDF */
    @media screen {
      body {
        background: #525659;
        padding: 0 0 32px;
      }

      .natus-invoice {
        width: 210mm;
        min-height: 297mm;
        margin: 24px auto;
        background: #fff;
        box-shadow: 0 6px 28px rgba(0, 0, 0, 0.4);
      }

      .natus-invoice-sheet {
        min-height: 297mm;
        padding: 18mm 16mm;
      }
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
      font-size: 2.1rem;
      font-weight: 400;
      letter-spacing: 0.04em;
      line-height: 1;
    }

    .natus-invoice-number { margin: 10px 0 0; font-size: 16px; }

    .natus-invoice-number-value {
      font-size: 18px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    .natus-invoice-logo { flex-shrink: 0; text-align: right; }

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
    .natus-invoice-party-client { position: relative; }

    .natus-invoice-party-issuer { padding-left: 16px; text-align: left; }
    .natus-invoice-party-client { padding-right: 16px; text-align: right; }

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
    .natus-invoice-party-client p { margin: 0 0 4px; font-size: 14px; }

    .natus-invoice-party-name {
      font-size: 16px !important;
      font-weight: 700;
      margin-bottom: 6px !important;
    }

    .natus-invoice-party-gap { padding-top: 4px; }

    .natus-invoice-table-wrap { width: 100%; overflow: visible; }

    .natus-invoice-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 14px;
    }

    .natus-invoice-table col.col-desc { width: 52%; }
    .natus-invoice-table col.col-code { width: 30%; }
    .natus-invoice-table col.col-qty { width: 18%; }

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

    .natus-invoice-table th:nth-child(3) { text-align: right; }

    .natus-invoice-table td {
      padding: 14px 8px;
      vertical-align: top;
      border-bottom: 1px solid ${NATUS_BRAND.borderSoft};
      word-break: break-word;
    }

    .natus-invoice-table td.col-desc { padding-left: 12px; font-weight: 500; }
    .natus-invoice-table td.col-code { font-family: monospace; font-size: 12px; color: ${NATUS_BRAND.inkSoft}; }
    .natus-invoice-table td.col-qty {
      text-align: right;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }

    .natus-invoice-table tbody tr:last-child td { border-bottom: none; }

    .natus-invoice-totals {
      margin-top: 0;
      overflow: hidden;
      border: 1px solid ${NATUS_BRAND.borderSoft};
      border-top: none;
    }

    .natus-invoice-totals-inner { margin-left: auto; width: 100%; max-width: 24rem; }

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

    .natus-invoice-total-ttc { font-size: 20px; font-weight: 700; }

    .natus-bon-notes {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid ${NATUS_BRAND.border};
    }

    .natus-bon-notes p { margin: 0 0 4px; font-size: 14px; }

    .natus-bon-signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 40px;
    }

    .natus-bon-signature-line {
      margin-top: 48px;
      border-bottom: 1px solid;
    }

    .natus-invoice-footer {
      margin-top: 40px;
      padding-top: 32px;
      border-top: 1px solid ${NATUS_BRAND.border};
    }

    .natus-invoice-cashier { margin: 0; font-size: 14px; font-weight: 600; }

    .natus-invoice-legal { margin: 12px 0 0; font-size: 11px; line-height: 1.6; }

    @media print {
      .natus-doc-toolbar { display: none !important; }

      body {
        background: #fff !important;
        color: #000 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: economy !important;
        print-color-adjust: economy !important;
      }

      .natus-invoice {
        width: auto !important;
        min-height: 0 !important;
        margin: 0 auto !important;
        box-shadow: none !important;
      }

      .natus-invoice,
      .natus-invoice-sheet,
      .natus-invoice * {
        box-shadow: none !important;
        text-shadow: none !important;
        background: #fff !important;
        color: #000 !important;
        -webkit-print-color-adjust: economy !important;
        print-color-adjust: economy !important;
      }

      .natus-invoice-sheet { padding: 0 !important; overflow: visible !important; }
      .natus-invoice-monogram { display: none !important; }

      .natus-invoice-print-header {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      .natus-invoice-header,
      .natus-invoice-parties,
      .natus-invoice-footer { border-color: #000 !important; }

      .natus-invoice-party-accent { background: #000 !important; opacity: 0.2 !important; }

      .natus-invoice-table-wrap {
        border: 1px solid #000 !important;
        border-bottom: none !important;
        overflow: visible !important;
      }

      .natus-invoice-table th {
        border: 1px solid #2c2418 !important;
        background: #2c2418 !important;
        color: #fff !important;
        font-weight: 700 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .natus-invoice-table td { border: 1px solid #ccc !important; }

      .natus-invoice-table tbody tr {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .natus-invoice-totals,
      .natus-invoice-footer {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      .natus-invoice-totals { border: 1px solid #000 !important; border-top: none !important; }

      .natus-invoice-total-bar {
        background: #2c2418 !important;
        color: #fff !important;
        border-top: 2px solid #2c2418 !important;
        font-weight: 700 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }

    ${PRINT_A4_MEDIA_CSS}`;

export function buildTransferDocHtml(
  data: BonCommandeData,
  kind: TransferDocumentKind
): string {
  const title = kind === "livraison" ? "Bon de livraison" : "Bon de commande";
  const toolbar = `
  <div class="natus-doc-toolbar">
    <span>${title} N° ${escapeHtml(data.orderNumber)} — format A4</span>
    <button type="button" onclick="window.print()">Imprimer / Enregistrer en PDF</button>
  </div>`;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${title} ${escapeHtml(data.orderNumber)}</title>
  <style>${BON_COMMANDE_STYLES}</style>
</head>
<body>${toolbar}${buildTransferDocBody(data, kind)}</body>
</html>`;
}

export function buildBonCommandeHtml(data: BonCommandeData): string {
  return buildTransferDocHtml(data, "commande");
}

export function buildBonLivraisonHtml(data: BonCommandeData): string {
  return buildTransferDocHtml(data, "livraison");
}

function openHtmlDocumentWindow(html: string) {
  const docWindow = window.open("", "_blank");
  if (!docWindow) return;
  docWindow.document.write(html);
  docWindow.document.close();
  docWindow.focus();
}

function downloadHtml(html: string, filename: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Ouvre le bon de commande dans un onglet, en aperçu A4 (bouton « Imprimer / PDF »). */
export function printBonCommandeHtml(data: BonCommandeData): void {
  openHtmlDocumentWindow(buildBonCommandeHtml(data));
}

export function downloadBonCommandeHtml(data: BonCommandeData): void {
  downloadHtml(buildBonCommandeHtml(data), `bon-commande-${data.orderNumber}.html`);
}

/** Ouvre le bon de livraison dans un onglet, en aperçu A4 (bouton « Imprimer / PDF »). */
export function printBonLivraisonHtml(data: BonCommandeData): void {
  openHtmlDocumentWindow(buildBonLivraisonHtml(data));
}

export function downloadBonLivraisonHtml(data: BonCommandeData): void {
  downloadHtml(buildBonLivraisonHtml(data), `bon-livraison-${data.orderNumber}.html`);
}
