import { toLocalDateKey } from "@/lib/utils";

export type StoreTrackingPreset = "today" | "week" | "month" | "quarter" | "custom";

export const STORE_TRACKING_PRESETS: { id: StoreTrackingPreset; label: string }[] = [
  { id: "today", label: "Aujourd'hui" },
  { id: "week", label: "Cette semaine" },
  { id: "month", label: "Ce mois" },
  { id: "quarter", label: "3 mois" },
  { id: "custom", label: "Date à date" },
];

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

function endOfWeekSunday(d: Date): Date {
  const start = startOfWeekMonday(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return endOfDay(end);
}

/** Lundi → dimanche de la semaine calendaire (clés fr-CA). */
export function weekToTodayDateKeys(now = new Date()): { from: string; to: string } {
  return {
    from: toLocalDateKey(startOfWeekMonday(now)),
    to: toLocalDateKey(endOfWeekSunday(now)),
  };
}

export type OrderDatePreset = "all" | "today" | "week" | "month";

export const ORDER_DATE_PRESETS: { id: OrderDatePreset; label: string }[] = [
  { id: "all", label: "Tout" },
  { id: "today", label: "Aujourd'hui" },
  { id: "week", label: "Cette semaine" },
  { id: "month", label: "Ce mois" },
];

/** Clés date début/fin pour un filtre commandes (fr-CA). */
export function orderDatePresetToKeys(
  preset: OrderDatePreset,
  now = new Date()
): { from: string; to: string } {
  switch (preset) {
    case "all":
      return { from: "", to: "" };
    case "today": {
      const today = toLocalDateKey(now);
      return { from: today, to: today };
    }
    case "week":
      return weekToTodayDateKeys(now);
    case "month":
      return {
        from: toLocalDateKey(startOfMonth(now)),
        to: toLocalDateKey(now),
      };
  }
}

export function detectOrderDatePreset(
  from: string,
  to: string,
  now = new Date()
): OrderDatePreset | "custom" {
  for (const { id } of ORDER_DATE_PRESETS) {
    const keys = orderDatePresetToKeys(id, now);
    if (keys.from === from && keys.to === to) return id;
  }
  return "custom";
}

export function orderDatePresetLabel(preset: OrderDatePreset | "custom"): string {
  if (preset === "custom") return "Période personnalisée";
  return ORDER_DATE_PRESETS.find((p) => p.id === preset)?.label ?? "";
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function parseDateKey(key: string): Date | null {
  if (!key) return null;
  const [y, m, day] = key.split("-").map(Number);
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day);
}

export function isDateInRange(isoDate: string, from: Date, to: Date): boolean {
  const t = new Date(isoDate).getTime();
  return t >= from.getTime() && t <= to.getTime();
}

export function resolveStoreTrackingRange(
  preset: StoreTrackingPreset,
  customFrom: string,
  customTo: string
): { from: Date; to: Date; label: string } {
  const now = new Date();
  const todayEnd = endOfDay(now);

  switch (preset) {
    case "today":
      return {
        from: startOfDay(now),
        to: todayEnd,
        label: "Aujourd'hui",
      };
    case "week":
      return {
        from: startOfWeekMonday(now),
        to: todayEnd,
        label: "Cette semaine",
      };
    case "month":
      return {
        from: startOfMonth(now),
        to: todayEnd,
        label: "Ce mois",
      };
    case "quarter": {
      const from = startOfDay(now);
      from.setMonth(from.getMonth() - 3);
      return {
        from,
        to: todayEnd,
        label: "3 derniers mois",
      };
    }
    case "custom": {
      const fromParsed = parseDateKey(customFrom);
      const toParsed = parseDateKey(customTo);
      const from = fromParsed ? startOfDay(fromParsed) : startOfDay(now);
      const to = toParsed ? endOfDay(toParsed) : todayEnd;
      const safeTo = to.getTime() < from.getTime() ? endOfDay(from) : to;
      return {
        from,
        to: safeTo,
        label:
          customFrom && customTo
            ? `Du ${customFrom} au ${customTo}`
            : "Période personnalisée",
      };
    }
  }
}
