import { NATUS_BRAND } from "@/lib/constants/natus-brand";

/**
 * Aperçu A4 partagé (facture, bon de commande, bon de livraison) :
 * feuille A4 centrée sur fond gris à l'écran + barre d'action, masquée à l'impression.
 * S'adapte automatiquement à 1 ou plusieurs pages (min-height A4, pagination via @page).
 */
export const A4_DOC_PREVIEW_CSS = `
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
    font-family: system-ui, -apple-system, sans-serif;
  }

  .natus-doc-toolbar span {
    font-size: 13px;
    letter-spacing: 0.02em;
    opacity: 0.9;
  }

  .natus-doc-toolbar button {
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

  @media screen {
    body {
      margin: 0;
      background: #525659;
      padding: 0 0 32px;
    }

    .natus-invoice,
    .export-summary {
      width: 210mm;
      margin: 24px auto;
      background: #fff;
      box-shadow: 0 6px 28px rgba(0, 0, 0, 0.4);
    }

    .natus-invoice { min-height: 297mm; }

    .natus-invoice-sheet {
      min-height: 297mm;
      padding: 18mm 16mm;
    }

    .invoice-page { margin: 0 auto; }
  }

  @media print {
    .natus-doc-toolbar { display: none !important; }

    body { padding: 0 !important; }

    .natus-invoice,
    .export-summary {
      width: auto !important;
      min-height: 0 !important;
      margin: 0 auto !important;
      box-shadow: none !important;
    }
  }
`;

/** Barre d'action affichée à l'écran (masquée à l'impression). `title` doit déjà être échappé. */
export function buildDocToolbar(title: string): string {
  return `
  <div class="natus-doc-toolbar">
    <span>${title} — format A4</span>
    <button type="button" onclick="window.print()">Imprimer / Enregistrer en PDF</button>
  </div>`;
}

/** Règles @page A4 — marges + numéros de page (source unique). */
export const A4_PAGE_CSS = `
  @page {
    size: A4 portrait;
    margin: 14mm 12mm 20mm 12mm;
    @bottom-center {
      content: "Page " counter(page) " / " counter(pages);
      font-size: 8pt;
      color: #000;
      font-family: system-ui, -apple-system, sans-serif;
    }
  }
`;

/** Ticket thermique 80 mm — hauteur automatique selon le contenu. */
export const TICKET_PAGE_CSS = `
  @page {
    size: 80mm auto;
    margin: 0;
  }
`;

/** Tableaux paginés : en-têtes répétés, pied de page, lignes. */
export const PRINT_TABLE_PAGINATION_CSS = `
  table.natus-print-table {
    width: 100%;
    border-collapse: collapse;
    page-break-inside: auto;
    break-inside: auto;
  }

  table.natus-print-table thead {
    display: table-header-group;
  }

  table.natus-print-table tfoot {
    display: table-footer-group;
  }

  table.natus-print-table tbody {
    display: table-row-group;
  }

  table.natus-print-table tr.natus-print-row-avoid {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  table.natus-print-table tr.natus-print-row-break {
    break-inside: auto;
    page-break-inside: auto;
  }

  .natus-print-doc-banner {
    display: none;
  }
`;

/** Styles d'impression communs A4 (HTML téléchargé + @media print in-app). */
export const PRINT_A4_MEDIA_CSS = `
  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      -webkit-print-color-adjust: economy !important;
      print-color-adjust: economy !important;
    }

    .natus-print-sheet,
    .natus-invoice-sheet,
    .natus-sales-report > div {
      padding: 0 !important;
      overflow: visible !important;
    }

    .natus-print-doc-banner {
      display: table-row !important;
    }

    .natus-print-doc-banner th {
      padding: 2mm 3mm !important;
      font-size: 7pt !important;
      font-weight: 700 !important;
      letter-spacing: 0.06em !important;
      text-transform: uppercase !important;
      text-align: left !important;
      border-bottom: 1px solid #000 !important;
      background: #fff !important;
      color: #000 !important;
    }

    table.natus-print-table thead {
      display: table-header-group !important;
    }

    table.natus-print-table tfoot {
      display: table-footer-group !important;
    }

    .natus-print-block-avoid {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    .natus-print-block-after {
      break-after: page !important;
      page-break-after: always !important;
    }
  }
`;

/** Styles d'impression ticket thermique (HTML + in-app). */
export const PRINT_TICKET_MEDIA_CSS = `
  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      -webkit-print-color-adjust: economy !important;
      print-color-adjust: economy !important;
    }

    .natus-ticket,
    .ticket {
      width: 80mm !important;
      max-width: 80mm !important;
      margin: 0 auto !important;
      padding: 2mm !important;
      overflow: visible !important;
      box-shadow: none !important;
    }

    table.natus-print-table thead {
      display: table-header-group !important;
    }

    table.natus-print-table tbody tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .natus-print-doc-banner {
      display: table-row !important;
    }

    .natus-print-doc-banner th {
      padding: 1mm 0 !important;
      font-size: 7pt !important;
      font-weight: 900 !important;
      text-transform: uppercase !important;
      border-bottom: 1px solid #000 !important;
      text-align: center !important;
    }

    .natus-print-footer-avoid {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
  }
`;

export const A4_PAGE_RULES_FOR_INJECT = `@media print {${A4_PAGE_CSS}}`;

export const TICKET_PAGE_RULES_FOR_INJECT = `@media print {${TICKET_PAGE_CSS}
    html, body {
      width: 80mm !important;
      height: auto !important;
      min-height: 0 !important;
      margin: 0 auto !important;
      padding: 0 !important;
      overflow: visible !important;
      background: #fff !important;
    }
  }`;
