import type { ZReportAnalytics } from "@/lib/sales/z-report-types";

const COLORS = {
  primary: "#B38C4A",
  champagne: "#FAEAA1",
  success: "#4A7C59",
  muted: "#666666",
  border: "#CCCCCC",
  background: "#FFFDF9",
};

function formatMoney(value: number): string {
  return `${Math.round(value).toLocaleString("fr-FR")} DH`;
}

async function canvasToBuffer(canvas: HTMLCanvasElement): Promise<ArrayBuffer> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
  if (!blob) throw new Error("Impossible de générer le graphique");
  return blob.arrayBuffer();
}

function drawTitle(ctx: CanvasRenderingContext2D, title: string, width: number) {
  ctx.fillStyle = "#000000";
  ctx.font = "bold 18px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, width / 2, 28);
}

function drawBarChart(
  labels: string[],
  values: number[],
  title: string,
  valueFormatter: (v: number) => string = formatMoney
): Promise<ArrayBuffer> {
  const width = 920;
  const height = 360;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, height);
  drawTitle(ctx, title, width);

  const max = Math.max(...values, 1);
  const chartTop = 48;
  const chartBottom = height - 56;
  const chartHeight = chartBottom - chartTop;
  const barGap = 6;
  const barWidth = Math.max(
    12,
    (width - 80 - barGap * (labels.length - 1)) / Math.max(labels.length, 1)
  );
  let x = 40;

  labels.forEach((label, index) => {
    const value = values[index] ?? 0;
    const barHeight = (value / max) * chartHeight;
    const y = chartBottom - barHeight;

    ctx.fillStyle = COLORS.champagne;
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.strokeStyle = COLORS.primary;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, barHeight);

    ctx.fillStyle = COLORS.muted;
    ctx.font = "10px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.save();
    ctx.translate(x + barWidth / 2, chartBottom + 14);
    ctx.rotate(-0.5);
    ctx.fillText(label.slice(0, 12), 0, 0);
    ctx.restore();

    if (value > 0) {
      ctx.fillStyle = "#000000";
      ctx.font = "9px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(valueFormatter(value), x + barWidth / 2, y - 4);
    }

    x += barWidth + barGap;
  });

  ctx.strokeStyle = COLORS.border;
  ctx.beginPath();
  ctx.moveTo(36, chartBottom);
  ctx.lineTo(width - 20, chartBottom);
  ctx.stroke();

  return canvasToBuffer(canvas);
}

function drawHorizontalBars(
  labels: string[],
  values: number[],
  percents: number[],
  title: string
): Promise<ArrayBuffer> {
  const width = 920;
  const rowHeight = 36;
  const height = Math.max(280, 80 + labels.length * rowHeight);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, height);
  drawTitle(ctx, title, width);

  const barMaxWidth = width - 280;
  let y = 56;

  labels.forEach((label, index) => {
    const percent = percents[index] ?? 0;
    const barWidth = (percent / 100) * barMaxWidth;

    ctx.fillStyle = "#000000";
    ctx.font = "12px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(label.slice(0, 28), 24, y + 14);

    ctx.fillStyle = "#EEEEEE";
    ctx.fillRect(220, y, barMaxWidth, 18);
    ctx.fillStyle = index === 0 ? COLORS.primary : COLORS.success;
    ctx.fillRect(220, y, barWidth, 18);

    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = "right";
    ctx.fillText(
      `${formatMoney(values[index] ?? 0)} (${percent.toFixed(0)}%)`,
      width - 24,
      y + 14
    );

    y += rowHeight;
  });

  return canvasToBuffer(canvas);
}

function drawPieChart(
  labels: string[],
  values: number[],
  title: string
): Promise<ArrayBuffer> {
  const width = 640;
  const height = 360;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, height);
  drawTitle(ctx, title, width);

  const total = values.reduce((s, v) => s + v, 0);
  const sliceColors = [COLORS.success, COLORS.primary, COLORS.muted];
  const cx = 200;
  const cy = 190;
  const radius = 100;
  let startAngle = -Math.PI / 2;

  if (total <= 0) {
    ctx.fillStyle = COLORS.muted;
    ctx.font = "14px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Aucune donnée", width / 2, height / 2);
    return canvasToBuffer(canvas);
  }

  values.forEach((value, index) => {
    const sliceAngle = (value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = sliceColors[index % sliceColors.length];
    ctx.fill();
    startAngle += sliceAngle;
  });

  let legendY = 100;
  labels.forEach((label, index) => {
    ctx.fillStyle = sliceColors[index % sliceColors.length];
    ctx.fillRect(360, legendY, 14, 14);
    ctx.fillStyle = "#000000";
    ctx.font = "13px Arial, sans-serif";
    ctx.textAlign = "left";
    const pct = total > 0 ? ((values[index] ?? 0) / total) * 100 : 0;
    ctx.fillText(`${label} — ${formatMoney(values[index] ?? 0)} (${pct.toFixed(0)}%)`, 382, legendY + 12);
    legendY += 28;
  });

  return canvasToBuffer(canvas);
}

export async function renderZReportChartImages(
  analytics: ZReportAnalytics,
  scopeLabel: string
): Promise<{ title: string; buffer: ArrayBuffer; width: number; height: number }[]> {
  const charts: { title: string; buffer: ArrayBuffer; width: number; height: number }[] = [];

  if (analytics.paymentMix.some((slice) => slice.amount > 0)) {
    charts.push({
      title: "Répartition des paiements",
      buffer: await drawPieChart(
        analytics.paymentMix.map((slice) => slice.label),
        analytics.paymentMix.map((slice) => slice.amount),
        `Paiements — ${scopeLabel}`
      ),
      width: 640,
      height: 360,
    });
  }

  if (analytics.hourlySeries.some((point) => point.sales > 0)) {
    charts.push({
      title: "Activité horaire",
      buffer: await drawBarChart(
        analytics.hourlySeries.filter((_, index) => index % 2 === 0).map((point) => point.label),
        analytics.hourlySeries.filter((_, index) => index % 2 === 0).map((point) => point.sales),
        `Ventes par heure — ${scopeLabel}`,
        (value) => `${value} vente${value !== 1 ? "s" : ""}`
      ),
      width: 920,
      height: 360,
    });
  }

  if (analytics.storeRanking.length > 1) {
    const top = analytics.storeRanking.slice(0, 8);
    charts.push({
      title: "CA par site",
      buffer: await drawHorizontalBars(
        top.map((row) => row.storeName),
        top.map((row) => row.revenue),
        top.map((row) => row.share),
        `Classement sites — ${scopeLabel}`
      ),
      width: 920,
      height: Math.max(280, 80 + top.length * 36),
    });
  }

  if (analytics.topProducts.length > 0) {
    const top = analytics.topProducts.slice(0, 8);
    charts.push({
      title: "Top produits",
      buffer: await drawHorizontalBars(
        top.map((product) => product.name),
        top.map((product) => product.revenue),
        top.map((product) => {
          const max = top[0]?.revenue || 1;
          return (product.revenue / max) * 100;
        }),
        `Top produits (CA) — ${scopeLabel}`
      ),
      width: 920,
      height: Math.max(280, 80 + top.length * 36),
    });
  }

  return charts;
}
