import type { DashboardAnalyticsPayload } from "@/lib/dashboard/analytics-types";

export type DashboardReportSummaryRow = {
  storeName: string;
  city: string;
  salesCount: number;
  revenue: number;
  averageTicket: number;
  cashRevenue: number;
  cardRevenue: number;
  chequeRevenue: number;
  lowStockCount: number;
  totalUnits: number;
  stockMovements: number;
};

export type DashboardReportSaleRow = {
  date: string;
  storeName: string;
  city: string;
  cashier: string;
  customer: string;
  total: number;
  payment: string;
  itemsCount: number;
  status: string;
};

export type DashboardReportStockRow = {
  date: string;
  storeName: string;
  product: string;
  quantity: number;
  type: string;
  actor: string;
  notes: string;
};

export type DashboardReportPayload = {
  periodLabel: string;
  generatedAt: string;
  scopeLabel: string;
  summary: DashboardReportSummaryRow[];
  sales: DashboardReportSaleRow[];
  stockMovements: DashboardReportStockRow[];
  totals: {
    salesCount: number;
    revenue: number;
    averageTicket: number;
    cashRevenue: number;
    cardRevenue: number;
    chequeRevenue: number;
  };
  analytics: DashboardAnalyticsPayload;
};
