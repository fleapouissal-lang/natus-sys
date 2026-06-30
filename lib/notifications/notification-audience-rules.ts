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

/** Transferts entrants en attente de réception : magasin ou dépôt destinataire. */
export function scopeReceivesTransferAlerts(scope: NotificationScope): boolean {
  return scope.mode === "store" || scope.mode === "hub";
}

/** Visibilité des mouvements de stock (envoyés + reçus) pour hub, gérant et directeur. */
export function scopeReceivesTransferMovements(scope: NotificationScope): boolean {
  return (
    scope.mode === "hub" ||
    scope.mode === "city" ||
    scope.mode === "director" ||
    scope.mode === "store"
  );
}

/** Notifications commandes en ligne (hors caisse POS seule). */
export function scopeReceivesOrderAlerts(scope: NotificationScope): boolean {
  return (
    scope.mode === "store" ||
    scope.mode === "city" ||
    scope.mode === "director" ||
    scope.mode === "hub"
  );
}

export function isTransferAwaitingReceipt(status: string): boolean {
  return status !== "received";
}

export function isTransferSentEvent(status: string): boolean {
  return (
    status === "en_cours" ||
    status === "pret" ||
    status === "en_livraison" ||
    status === "livre" ||
    status === "sent"
  );
}
