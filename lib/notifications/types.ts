export type CashierNotificationKind =
  | "order_new"
  | "order_transferred"
  | "hub_transfer"
  | "stock_low"
  | "stock_out";

export type NotificationAudience = "store" | "city" | "director" | "hub";

/** @deprecated alias */
export type CashierOrderNotification = CashierNotification;

export interface CashierNotification {
  id: string;
  kind: CashierNotificationKind;
  entityId: string;
  title: string;
  subtitle: string | null;
  /** Montant commande, unités hub, ou quantité en stock */
  amount: number | null;
  receivedAt: string;
  read: boolean;
  audience?: NotificationAudience;
  storeId?: string;
  storeName?: string | null;
  productId?: string;
  /** Entrepôt hub (seuil 100) vs magasin retail (seuil 20). */
  isHubStore?: boolean;
}
