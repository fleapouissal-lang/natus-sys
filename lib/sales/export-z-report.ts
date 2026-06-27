import ExcelJS from "exceljs";
import {
  formatDayClosureDateShort,
  formatSaleLineItemsMultiline,
} from "@/lib/sales/day-closure";
import { formatZReportFilename, paymentLabel } from "@/lib/sales/z-report-analytics";
import { renderZReportChartImages } from "@/lib/sales/z-report-charts";
import type { ZReportPayload } from "@/lib/sales/z-report-types";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) {
    return value.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  }
  if (typeof value === "object" && "richText" in value) {
    return String(value);
  }
  return String(value);
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFB38C4A" },
  };
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  row.height = 24;
}

function autoFitColumns(
  sheet: ExcelJS.Worksheet,
  options?: { min?: number; max?: number; wrapCols?: number[] }
) {
  const min = options?.min ?? 8;
  const max = options?.max ?? 56;
  const wrapCols = new Set(options?.wrapCols ?? []);

  sheet.columns.forEach((column, index) => {
    const colNumber = index + 1;
    let width = min;

    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const text = cellText(cell.value);
      const lines = text.split("\n");
      const longest = Math.max(...lines.map((line) => line.length), 0);
      width = Math.max(width, Math.min(longest + 2, max));

      if (wrapCols.has(colNumber)) {
        cell.alignment = {
          ...cell.alignment,
          vertical: "top",
          wrapText: true,
        };
      }
    });

    column.width = width;
  });
}

function triggerDownload(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadZReportExcel(data: ZReportPayload): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Natus";
  wb.created = new Date();
  const { analytics } = data;

  const synth = wb.addWorksheet("Synthèse");
  synth.addRow(["Z-Rapport Natus — Clôtures caisse"]);
  synth.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFB38C4A" } };
  synth.mergeCells("A1:D1");
  synth.addRow(["Périmètre", data.scopeLabel]);
  synth.addRow(["Mode", data.mode === "multi" ? "Multi-sites" : "Site unique"]);
  synth.addRow(["Clôtures analysées", data.closures.length]);
  synth.addRow(["Généré le", data.generatedAt]);
  synth.addRow([]);

  const kpiHeaderRow = synth.addRow(["Indicateur", "Valeur", "Détail"]);
  styleHeaderRow(kpiHeaderRow);
  synth.addRow(["Chiffre d'affaires (DH)", roundMoney(analytics.totalRevenue), ""]);
  synth.addRow(["Nombre de ventes", analytics.totalSales, ""]);
  synth.addRow(["Panier moyen (DH)", roundMoney(analytics.averageTicket), ""]);
  synth.addRow([
    "Espèces (DH)",
    roundMoney(analytics.cash),
    `${analytics.paymentMix[0]?.percent.toFixed(0) ?? 0}% du CA`,
  ]);
  synth.addRow([
    "TPE (DH)",
    roundMoney(analytics.card),
    `${analytics.paymentMix[1]?.percent.toFixed(0) ?? 0}% du CA`,
  ]);
  synth.addRow(["Chèque (DH)", roundMoney(analytics.cheque), ""]);
  synth.addRow([
    "Annulations",
    analytics.cancelledCount,
    `${roundMoney(analytics.cancelledTotal)} DH`,
  ]);
  synth.addRow([]);

  const payHeader = synth.addRow(["Mode de paiement", "Montant (DH)", "Part (%)"]);
  styleHeaderRow(payHeader);
  analytics.paymentMix.forEach((slice) => {
    synth.addRow([slice.label, roundMoney(slice.amount), roundMoney(slice.percent)]);
  });
  synth.addRow([]);

  if (analytics.closureSummaries.length > 0) {
    const closureHeader = synth.addRow([
      "Site",
      "Ville",
      "Jour métier",
      "Ventes",
      "CA (DH)",
      "Part (%)",
    ]);
    styleHeaderRow(closureHeader);
    analytics.storeRanking.forEach((row) => {
      synth.addRow([
        row.storeName,
        row.city,
        formatDayClosureDateShort(row.businessDate),
        row.sales,
        roundMoney(row.revenue),
        roundMoney(row.share),
      ]);
    });
    synth.addRow([]);
  }

  const topProducts = analytics.topProducts.slice(0, 15);
  if (topProducts.length > 0) {
    const topHeader = synth.addRow([
      "Top produits",
      "Qté",
      "CA (DH)",
      "Part (%)",
      "Prix moy. (DH)",
    ]);
    styleHeaderRow(topHeader);
    topProducts.forEach((row) => {
      synth.addRow([
        row.name,
        row.quantity,
        roundMoney(row.revenue),
        roundMoney(row.share),
        row.quantity > 0 ? roundMoney(row.revenue / row.quantity) : 0,
      ]);
    });
  }

  autoFitColumns(synth, { min: 10, max: 48, wrapCols: [1, 3] });

  const products = wb.addWorksheet("Produits");
  const productsHeader = products.addRow([
    "#",
    "Produit",
    "Code-barres",
    "Quantité",
    "CA (DH)",
    "Part CA (%)",
    "Prix moy. (DH)",
  ]);
  styleHeaderRow(productsHeader);
  analytics.topProducts.forEach((row, index) => {
    products.addRow([
      index + 1,
      row.name,
      row.barcode ?? "—",
      row.quantity,
      roundMoney(row.revenue),
      roundMoney(row.share),
      row.quantity > 0 ? roundMoney(row.revenue / row.quantity) : 0,
    ]);
  });
  autoFitColumns(products, { min: 8, max: 52, wrapCols: [2] });

  const salesSummary = wb.addWorksheet("Ventes synthèse");
  const salesSummaryHeader = salesSummary.addRow([
    "Site",
    "Jour métier",
    "Heure",
    "Caissier",
    "Paiement",
    "Total (DH)",
    "Statut",
    "Articles (nom × qté)",
  ]);
  styleHeaderRow(salesSummaryHeader);

  for (const block of data.closures) {
    for (const sale of block.sales) {
      salesSummary.addRow([
        block.closure.store_name,
        formatDayClosureDateShort(block.closure.business_date),
        new Date(sale.created_at).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        sale.profiles?.full_name || sale.profiles?.email || "—",
        paymentLabel(sale.payment_method),
        roundMoney(Number(sale.total)),
        sale.cancelled_at ? "Annulée" : "Validée",
        formatSaleLineItemsMultiline(sale),
      ]);
    }
  }

  autoFitColumns(salesSummary, {
    min: 8,
    max: 52,
    wrapCols: [1, 4, 8],
  });

  const salesSheet = wb.addWorksheet("Ventes détaillées");
  const salesHeader = salesSheet.addRow([
    "Site",
    "Jour métier",
    "Heure",
    "Caissier",
    "Client",
    "Paiement",
    "Total vente (DH)",
    "Statut",
    "Produits vendus (qté)",
    "Produit",
    "Code-barres",
    "Qté",
    "P.U. (DH)",
    "Total ligne (DH)",
  ]);
  styleHeaderRow(salesHeader);

  for (const block of data.closures) {
    for (const sale of block.sales) {
      const items = sale.sale_items || [];
      const saleMeta = {
        store: block.closure.store_name,
        day: formatDayClosureDateShort(block.closure.business_date),
        time: new Date(sale.created_at).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        cashier: sale.profiles?.full_name || sale.profiles?.email || "—",
        customer: sale.customer_name || "—",
        payment: paymentLabel(sale.payment_method),
        total: roundMoney(Number(sale.total)),
        status: sale.cancelled_at ? "Annulée" : "Validée",
        productsSummary: formatSaleLineItemsMultiline(sale),
      };

      if (items.length === 0) {
        salesSheet.addRow([
          saleMeta.store,
          saleMeta.day,
          saleMeta.time,
          saleMeta.cashier,
          saleMeta.customer,
          saleMeta.payment,
          saleMeta.total,
          saleMeta.status,
          saleMeta.productsSummary,
          "—",
          "—",
          0,
          0,
          0,
        ]);
        continue;
      }

      items.forEach((item, index) => {
        const qty = Number(item.quantity);
        const unit = Number(item.unit_price);
        salesSheet.addRow([
          index === 0 ? saleMeta.store : "",
          index === 0 ? saleMeta.day : "",
          index === 0 ? saleMeta.time : "",
          index === 0 ? saleMeta.cashier : "",
          index === 0 ? saleMeta.customer : "",
          index === 0 ? saleMeta.payment : "",
          index === 0 ? saleMeta.total : "",
          index === 0 ? saleMeta.status : "",
          index === 0 ? saleMeta.productsSummary : "",
          item.products?.name || "Produit",
          item.products?.barcode ?? "—",
          qty,
          roundMoney(unit),
          roundMoney(qty * unit),
        ]);
      });
    }
  }

  autoFitColumns(salesSheet, {
    min: 8,
    max: 56,
    wrapCols: [4, 5, 9, 10],
  });

  const analysis = wb.addWorksheet("Analyse");
  analysis.addRow(["Activité horaire"]);
  analysis.getCell("A1").font = { bold: true, size: 13, color: { argb: "FFB38C4A" } };
  const hourlyHeader = analysis.addRow(["Heure", "Ventes", "CA (DH)"]);
  styleHeaderRow(hourlyHeader);
  analytics.hourlySeries.forEach((point) => {
    analysis.addRow([point.label, point.sales, roundMoney(point.revenue)]);
  });

  const peakHours = [...analytics.hourlySeries]
    .filter((point) => point.sales > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  if (peakHours.length > 0) {
    analysis.addRow([]);
    analysis.addRow(["Heures les plus actives (CA)"]);
    analysis.getCell(`A${analysis.rowCount}`).font = {
      bold: true,
      size: 12,
      color: { argb: "FFB38C4A" },
    };
    const peakHeader = analysis.addRow(["Heure", "Ventes", "CA (DH)"]);
    styleHeaderRow(peakHeader);
    peakHours.forEach((point) => {
      analysis.addRow([point.label, point.sales, roundMoney(point.revenue)]);
    });
  }

  autoFitColumns(analysis, { min: 10, max: 24 });

  const charts = await renderZReportChartImages(analytics, data.scopeLabel);
  if (charts.length > 0) {
    const graphSheet = wb.addWorksheet("Graphiques");
    graphSheet.getColumn(1).width = 14;
    let rowCursor = 1;

    for (const chart of charts) {
      graphSheet.getCell(rowCursor, 1).value = chart.title;
      graphSheet.getCell(rowCursor, 1).font = {
        bold: true,
        size: 13,
        color: { argb: "FFB38C4A" },
      };
      rowCursor += 1;

      const imageId = wb.addImage({
        buffer: chart.buffer,
        extension: "png",
      });

      graphSheet.addImage(imageId, {
        tl: { col: 0, row: rowCursor - 1 },
        ext: { width: chart.width, height: chart.height },
      });

      rowCursor += Math.ceil(chart.height / 18) + 2;
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  triggerDownload(buffer, formatZReportFilename(data.scopeLabel, data.mode));
}
