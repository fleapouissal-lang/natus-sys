import ExcelJS from "exceljs";
import type { DashboardReportPayload } from "@/lib/dashboard/dashboard-report-types";
import { formatDelta, renderDashboardChartImages } from "@/lib/dashboard/export-analytics-charts";
import { reportFilenameSuffix, type DashboardReportPeriod } from "@/lib/dashboard/report-period";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFB38C4A" },
  };
  row.alignment = { vertical: "middle", horizontal: "center" };
  row.height = 22;
}

function autoWidth(sheet: ExcelJS.Worksheet, min = 10, max = 42) {
  sheet.columns.forEach((column) => {
    let width = min;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? "").length;
      width = Math.max(width, Math.min(len + 2, max));
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

export async function downloadDashboardReportExcel(
  data: DashboardReportPayload,
  period: DashboardReportPeriod
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Natus";
  wb.created = new Date();

  const { analytics } = data;
  const cashShare =
    analytics.current.revenue > 0
      ? (analytics.current.cashRevenue / analytics.current.revenue) * 100
      : 0;
  const cardShare =
    analytics.current.revenue > 0
      ? (analytics.current.cardRevenue / analytics.current.revenue) * 100
      : 0;

  const synth = wb.addWorksheet("Synthèse");
  synth.addRow(["Rapport Natus"]);
  synth.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFB38C4A" } };
  synth.addRow(["Période", data.periodLabel]);
  synth.addRow(["Périmètre", data.scopeLabel]);
  synth.addRow(["Généré le", data.generatedAt]);
  if (analytics.previousPeriodLabel) {
    synth.addRow(["Comparé à", analytics.previousPeriodLabel]);
  }
  synth.addRow([]);
  synth.addRow(["Indicateurs clés", "Valeur", "Évolution"]);
  styleHeaderRow(synth.getRow(7));
  synth.addRow([
    "Chiffre d'affaires (DH)",
    roundMoney(data.totals.revenue),
    formatDelta(analytics.trend.revenueDelta),
  ]);
  synth.addRow([
    "Nombre de ventes",
    data.totals.salesCount,
    formatDelta(analytics.trend.salesDelta),
  ]);
  synth.addRow([
    "Panier moyen (DH)",
    roundMoney(data.totals.averageTicket),
    formatDelta(analytics.trend.ticketDelta),
  ]);
  synth.addRow(["Espèces (DH)", roundMoney(data.totals.cashRevenue), `${cashShare.toFixed(0)}% du CA`]);
  synth.addRow(["TPE (DH)", roundMoney(data.totals.cardRevenue), `${cardShare.toFixed(0)}% du CA`]);
  synth.addRow(["Chèque (DH)", roundMoney(data.totals.chequeRevenue)]);
  synth.addRow([
    "Taux d'annulation",
    `${analytics.current.cancellationRate.toFixed(1)}%`,
    `${analytics.current.cancelledCount} vente(s)`,
  ]);
  synth.addRow([
    "Stock",
    `${analytics.totalUnits} unités`,
    `${analytics.stockAlerts} alerte(s) · ${analytics.catalogueSize} refs`,
  ]);
  autoWidth(synth);

  const compare = wb.addWorksheet("Comparaison périodes");
  compare.addRow([
    "Indicateur",
    analytics.periodLabel,
    analytics.previousPeriodLabel || "—",
    "Évolution",
  ]);
  styleHeaderRow(compare.getRow(1));
  const compareRows: [string, number | string, number | string, string][] = [
    ["CA (DH)", roundMoney(analytics.current.revenue), analytics.previous ? roundMoney(analytics.previous.revenue) : "—", formatDelta(analytics.trend.revenueDelta)],
    ["Ventes", analytics.current.salesCount, analytics.previous?.salesCount ?? "—", formatDelta(analytics.trend.salesDelta)],
    ["Panier moy. (DH)", roundMoney(analytics.current.averageTicket), analytics.previous ? roundMoney(analytics.previous.averageTicket) : "—", formatDelta(analytics.trend.ticketDelta)],
    ["Espèces (DH)", roundMoney(analytics.current.cashRevenue), analytics.previous ? roundMoney(analytics.previous.cashRevenue) : "—", "—"],
    ["TPE (DH)", roundMoney(analytics.current.cardRevenue), analytics.previous ? roundMoney(analytics.previous.cardRevenue) : "—", "—"],
    ["Annulations (%)", analytics.current.cancellationRate.toFixed(1), analytics.previous ? analytics.previous.cancellationRate.toFixed(1) : "—", "—"],
  ];
  compareRows.forEach((row) => compare.addRow(row));
  autoWidth(compare);

  const daily = wb.addWorksheet("CA journalier");
  daily.addRow(["Date", "Jour", "Ventes", "CA (DH)"]);
  styleHeaderRow(daily.getRow(1));
  analytics.dailySeries.forEach((point) => {
    daily.addRow([point.dateKey, point.label, point.sales, roundMoney(point.revenue)]);
  });
  autoWidth(daily);

  const payments = wb.addWorksheet("Paiements");
  payments.addRow(["Mode", "Montant (DH)", "Part (%)"]);
  styleHeaderRow(payments.getRow(1));
  analytics.paymentMix.forEach((slice) => {
    payments.addRow([slice.label, roundMoney(slice.amount), roundMoney(slice.percent)]);
  });
  autoWidth(payments);

  const hourly = wb.addWorksheet("Activité horaire");
  hourly.addRow(["Heure", "Ventes", "CA (DH)"]);
  styleHeaderRow(hourly.getRow(1));
  analytics.hourlySeries.forEach((point) => {
    hourly.addRow([point.label, point.sales, roundMoney(point.revenue)]);
  });
  autoWidth(hourly);

  const topProducts = wb.addWorksheet("Top produits");
  topProducts.addRow(["#", "Produit", "Quantité", "CA (DH)"]);
  styleHeaderRow(topProducts.getRow(1));
  analytics.topProducts.forEach((row, index) => {
    topProducts.addRow([index + 1, row.name, row.quantity, roundMoney(row.revenue)]);
  });
  autoWidth(topProducts);

  const topCashiers = wb.addWorksheet("Top caissiers");
  topCashiers.addRow(["#", "Caissier", "Ventes", "CA (DH)"]);
  styleHeaderRow(topCashiers.getRow(1));
  analytics.topCashiers.forEach((row, index) => {
    topCashiers.addRow([index + 1, row.name, row.sales, roundMoney(row.revenue)]);
  });
  autoWidth(topCashiers);

  if (analytics.storeRanking.length > 0) {
    const ranking = wb.addWorksheet("Classement magasins");
    ranking.addRow(["#", "Magasin", "Ville", "Ventes", "CA (DH)", "Part (%)"]);
    styleHeaderRow(ranking.getRow(1));
    analytics.storeRanking.forEach((row, index) => {
      ranking.addRow([
        index + 1,
        row.storeName,
        row.city,
        row.sales,
        roundMoney(row.revenue),
        roundMoney(row.share),
      ]);
    });
    autoWidth(ranking);
  }

  const summary = wb.addWorksheet("Par magasin");
  summary.addRow([
    "Magasin",
    "Ville",
    "Ventes",
    "CA (DH)",
    "Panier moy. (DH)",
    "Espèces (DH)",
    "TPE (DH)",
    "Chèque (DH)",
    "Stock faible",
    "Unités en stock",
    "Mouvements stock",
  ]);
  styleHeaderRow(summary.getRow(1));
  data.summary.forEach((row) => {
    summary.addRow([
      row.storeName,
      row.city,
      row.salesCount,
      roundMoney(row.revenue),
      roundMoney(row.averageTicket),
      roundMoney(row.cashRevenue),
      roundMoney(row.cardRevenue),
      roundMoney(row.chequeRevenue),
      row.lowStockCount,
      row.totalUnits,
      row.stockMovements,
    ]);
  });
  autoWidth(summary);

  const sales = wb.addWorksheet("Ventes");
  sales.addRow([
    "Date",
    "Magasin",
    "Ville",
    "Caissier",
    "Client",
    "Total (DH)",
    "Paiement",
    "Articles",
    "Statut",
  ]);
  styleHeaderRow(sales.getRow(1));
  data.sales.forEach((row) => {
    sales.addRow([
      row.date,
      row.storeName,
      row.city,
      row.cashier,
      row.customer,
      roundMoney(row.total),
      row.payment,
      row.itemsCount,
      row.status,
    ]);
  });
  autoWidth(sales);

  if (data.stockMovements.length > 0) {
    const stock = wb.addWorksheet("Mouvements stock");
    stock.addRow(["Date", "Magasin", "Produit", "Quantité", "Type", "Acteur", "Notes"]);
    styleHeaderRow(stock.getRow(1));
    data.stockMovements.forEach((row) => {
      stock.addRow([
        row.date,
        row.storeName,
        row.product,
        row.quantity,
        row.type,
        row.actor,
        row.notes,
      ]);
    });
    autoWidth(stock);
  }

  const charts = await renderDashboardChartImages(analytics);
  if (charts.length > 0) {
    const graphSheet = wb.addWorksheet("Graphiques");
    graphSheet.getColumn(1).width = 120;
    let rowCursor = 1;

    for (const chart of charts) {
      graphSheet.getCell(rowCursor, 1).value = chart.title;
      graphSheet.getCell(rowCursor, 1).font = { bold: true, size: 13, color: { argb: "FFB38C4A" } };
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
  triggerDownload(buffer, reportFilenameSuffix(period));
}
