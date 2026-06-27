export type AnalyticsKpi = {
  revenue: number;
  salesCount: number;
  averageTicket: number;
  cashRevenue: number;
  cardRevenue: number;
  chequeRevenue: number;
  cancelledCount: number;
  cancellationRate: number;
};

export type AnalyticsTrend = {
  revenueDelta: number | null;
  salesDelta: number | null;
  ticketDelta: number | null;
};

export type AnalyticsDailyPoint = {
  dateKey: string;
  label: string;
  revenue: number;
  sales: number;
};

export type AnalyticsPaymentSlice = {
  method: string;
  label: string;
  amount: number;
  percent: number;
};

export type AnalyticsTopProduct = {
  name: string;
  quantity: number;
  revenue: number;
};

export type AnalyticsTopCashier = {
  name: string;
  sales: number;
  revenue: number;
};

export type AnalyticsStoreRank = {
  storeId: string;
  storeName: string;
  city: string;
  revenue: number;
  sales: number;
  share: number;
};

export type AnalyticsHourlyPoint = {
  hour: number;
  label: string;
  sales: number;
  revenue: number;
};

export type DashboardAnalyticsPayload = {
  periodLabel: string;
  previousPeriodLabel: string;
  scopeLabel: string;
  current: AnalyticsKpi;
  previous: AnalyticsKpi | null;
  trend: AnalyticsTrend;
  dailySeries: AnalyticsDailyPoint[];
  paymentMix: AnalyticsPaymentSlice[];
  topProducts: AnalyticsTopProduct[];
  topCashiers: AnalyticsTopCashier[];
  storeRanking: AnalyticsStoreRank[];
  hourlySeries: AnalyticsHourlyPoint[];
  stockAlerts: number;
  totalUnits: number;
  catalogueSize: number;
};
