export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Lundi de la semaine (locale fr) */
export function getWeekStart(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return toDateInputValue(d);
}

/** Lundi de la semaine contenant dateStr (YYYY-MM-DD). */
export function normalizeWeekStart(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toDateInputValue(d);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toDateInputValue(d);
}

export function addWeeks(weekStart: string, weeks: number): string {
  return addDays(weekStart, weeks * 7);
}

export function getWeekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function parseWeekParam(week?: string | null): string {
  if (week && /^\d{4}-\d{2}-\d{2}$/.test(week)) {
    return normalizeWeekStart(week);
  }
  return getWeekStart();
}

/** Lundi–samedi (6 jours ouvrés). */
export function getWeekWorkDays(weekStart: string): string[] {
  return getWeekDays(normalizeWeekStart(weekStart)).slice(0, 6);
}

const DAY_NAMES = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."];
const DAY_SHORT = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"];

export function isToday(dateStr: string): boolean {
  return dateStr === toDateInputValue(new Date());
}

export function getShortDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return DAY_SHORT[d.getDay()];
}

export function getDayNumber(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00`).getDate();
}

export function formatShiftDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  const day = DAY_NAMES[d.getDay()];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${day} ${dd}/${mm}`;
}

export function formatWeekRangeLabel(weekStart: string): string {
  const weekEnd = addDays(weekStart, 6);
  const start = new Date(`${weekStart}T12:00:00`);
  const end = new Date(`${weekEnd}T12:00:00`);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" };
  const startLabel = start.toLocaleDateString("fr-FR", opts);
  const endLabel = end.toLocaleDateString("fr-FR", opts);
  const year = end.getFullYear();
  return `${startLabel} – ${endLabel} ${year}`;
}

export function formatTimeLabel(time: string): string {
  return time.slice(0, 5);
}
