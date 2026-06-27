import type { DayClosureStats } from "@/lib/sales/day-closure";
import type { StoreDayClosureReportRow } from "@/lib/sales/store-day-closure";
import type { Sale } from "@/lib/types";

export type ZReportSiteOption = {
  id: string;
  name: string;
  city: string;
  isHub: boolean;
};

export type ZReportClosureBlock = {
  closure: StoreDayClosureReportRow;
  sales: Sale[];
};

export type ZReportProductRow = {
  name: string;
  barcode: string | null;
  quantity: number;
  revenue: number;
  share: number;
};

export type ZReportPaymentSlice = {
  label: string;
  amount: number;
  percent: number;
};

export type ZReportStoreRankingRow = {
  storeName: string;
  city: string;
  businessDate: string;
  revenue: number;
  sales: number;
  share: number;
};

export type ZReportHourlyPoint = {
  label: string;
  sales: number;
  revenue: number;
};

export type ZReportClosureSummary = {
  storeName: string;
  storeCity: string;
  businessDate: string;
  stats: DayClosureStats;
  validatedAt: string | null;
};

export type ZReportAnalytics = {
  totalRevenue: number;
  totalSales: number;
  averageTicket: number;
  cash: number;
  card: number;
  cheque: number;
  cancelledCount: number;
  cancelledTotal: number;
  paymentMix: ZReportPaymentSlice[];
  topProducts: ZReportProductRow[];
  storeRanking: ZReportStoreRankingRow[];
  hourlySeries: ZReportHourlyPoint[];
  closureSummaries: ZReportClosureSummary[];
};

export type ZReportPayload = {
  scopeLabel: string;
  generatedAt: string;
  mode: "single" | "multi";
  closures: ZReportClosureBlock[];
  analytics: ZReportAnalytics;
};
