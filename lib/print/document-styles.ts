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

/** Ticket thermique 80 mm — pagination automatique si contenu long. */
export const TICKET_PAGE_CSS = `
  @page {
    size: 80mm auto;
    margin: 2mm;
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
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      background: #fff !important;
    }
  }`;
