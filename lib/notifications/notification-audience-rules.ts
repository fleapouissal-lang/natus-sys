import type { NotificationScope } from "@/lib/notifications/notification-scope";

/** Ruptures magasin : caissier du magasin concerné + gérant (city) + directeur. */
export function scopeReceivesRetailStockAlerts(scope: NotificationScope): boolean {
  return scope.mode === "store" || scope.mode === "city" || scope.mode === "director";
}

/** Ruptures dépôt : compte hub + directeur uniquement. */
export function scopeReceivesHubStockAlerts(scope: NotificationScope): boolean {
  return scope.mode === "hub" || scope.mode === "director";
}

export function scopeReceivesStockAlertsForStore(
  scope: NotificationScope,
  isHub: boolean
): boolean {
  return isHub
    ? scopeReceivesHubStockAlerts(scope)
    : scopeReceivesRetailStockAlerts(scope);
}

/** Transferts envoyés : magasin ou dépôt destinataire (pas gérant city, pas directeur). */
export function scopeReceivesTransferAlerts(scope: NotificationScope): boolean {
  return scope.mode === "store" || scope.mode === "hub";
}

export function isTransferAwaitingReceipt(status: string): boolean {
  return status !== "received";
}
