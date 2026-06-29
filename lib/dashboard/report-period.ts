import { toLocalDateKey } from "@/lib/utils";

export type DashboardReportPeriod = "today" | "minus3" | "week" | "month" | "all";

export const DASHBOARD_REPORT_PERIODS: { id: DashboardReportPeriod; label: string }[] = [
  { id: "today", label: "Aujourd'hui" },
  { id: "week", label: "Cette semaine" },
  { id: "month", label: "Ce mois" },
  { id: "all", label: "Tout" },
];

/** Dépôt, gérant, caissier — pas de CA, aujourd'hui ou date à date (max 3 jours avant). */
export const LIMITED_STORE_STAFF_REPORT_PERIODS: {
  id: "today" | "custom";
  label: string;
}[] = [
  { id: "today", label: "Aujourd'hui" },
  { id: "custom", label: "Date à date" },
];

export function isLimitedStoreStaffPeriod(period: string): boolean {
  return period === "today" || period === "custom";
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfWeekMonday(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function shiftDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function resolveDashboardReportRange(
  period: DashboardReportPeriod,
  now = new Date()
): { from: Date | null; to: Date; label: string } {
  const todayEnd = endOfDay(now);

  switch (period) {
    case "today":
      return { from: startOfDay(now), to: todayEnd, label: "Aujourd'hui" };
    case "minus3": {
      const day = shiftDays(now, -3);
      return { from: startOfDay(day), to: endOfDay(day), label: "Il y a 3 jours" };
    }
    case "week":
      return { from: startOfWeekMonday(now), to: todayEnd, label: "Cette semaine" };
    case "month":
      return { from: startOfMonth(now), to: todayEnd, label: "Ce mois" };
    case "all":
      return { from: null, to: todayEnd, label: "Tout" };
  }
}

export function resolveAnalyticsPeriods(
  period: DashboardReportPeriod,
  now = new Date()
): {
  current: { from: Date | null; to: Date; label: string };
  previous: { from: Date | null; to: Date; label: string } | null;
} {
  const current = resolveDashboardReportRange(period, now);

  switch (period) {
    case "today": {
      const yesterday = shiftDays(now, -1);
      return {
        current,
        previous: {
          from: startOfDay(yesterday),
          to: endOfDay(yesterday),
          label: "Hier",
        },
      };
    }
    case "minus3":
      return { current, previous: null };
    case "week": {
      const weekStart = startOfWeekMonday(now);
      const prevEnd = endOfDay(shiftDays(weekStart, -1));
      const prevStart = startOfDay(shiftDays(prevEnd, -6));
      return {
        current,
        previous: { from: prevStart, to: prevEnd, label: "Semaine précédente" },
      };
    }
    case "month": {
      const thisMonthStart = startOfMonth(now);
      const prevMonthEnd = endOfDay(shiftDays(thisMonthStart, -1));
      const prevMonthStart = startOfMonth(prevMonthEnd);
      return {
        current,
        previous: {
          from: prevMonthStart,
          to: prevMonthEnd,
          label: "Mois précédent",
        },
      };
    }
    case "all":
      return { current, previous: null };
  }
}

function parseDateKey(key: string): Date | null {
  if (!key) return null;
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/**
 * Plage personnalisée (date à date) pour l'analytique du tableau de bord.
 * La période de comparaison est la fenêtre de même durée juste avant le début.
 */
export function resolveCustomAnalyticsPeriods(
  fromKey: string,
  toKey: string,
  now = new Date()
): {
  current: { from: Date | null; to: Date; label: string };
  previous: { from: Date | null; to: Date; label: string } | null;
} {
  const parsedFrom = parseDateKey(fromKey);
  const parsedTo = parseDateKey(toKey);
  const from = parsedFrom ? startOfDay(parsedFrom) : startOfDay(now);
  let to = parsedTo ? endOfDay(parsedTo) : endOfDay(now);
  if (to.getTime() < from.getTime()) to = endOfDay(from);

  const label = fromKey && toKey ? `Du ${fromKey} au ${toKey}` : "Période personnalisée";

  const durationMs = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - durationMs);

  return {
    current: { from, to, label },
    previous: { from: prevFrom, to: prevTo, label: "Période précédente" },
  };
}

export function reportFilenameSuffix(period: DashboardReportPeriod): string {
  const dateKey = toLocalDateKey(new Date());
  return `natus-rapport-${period}-${dateKey}.xlsx`;
}
