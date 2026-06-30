import type { CashierNotification } from "@/lib/notifications/types";

const MAX_STORED = 50;
const STORAGE_VERSION = 4;

function storageKey(scopeKey: string) {
  return `natus-notifications-v${STORAGE_VERSION}-${scopeKey}`;
}

export function loadCashierNotifications(scopeKey: string): CashierNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(scopeKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CashierNotification[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_STORED) : [];
  } catch {
    return [];
  }
}

export function saveCashierNotifications(
  scopeKey: string,
  notifications: CashierNotification[]
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      storageKey(scopeKey),
      JSON.stringify(notifications.slice(0, MAX_STORED))
    );
  } catch {
    // quota / private mode
  }
}
