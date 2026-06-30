import type { ShopifyWorkflowStatus } from "@/lib/types";

export type CashierNotificationKind =
  | "order_new"
  | "order_transferred"
  | "order_status"
  | "hub_transfer"
  | "hub_transfer_sent"
  | "store_transfer"
  | "stock_low"
  | "stock_out";

export type NotificationAudience = "store" | "city" | "director" | "hub" | "livreur";

export type NotificationCategory = "order" | "stock" | "transfer";

export type NotificationPriority = "urgent" | "high" | "normal" | "low";

/** Envoyé depuis l'origine ou en attente à la destination. */
export type TransferPhase = "sent" | "received";

/** @deprecated alias */
export type CashierOrderNotification = CashierNotification;

export interface CashierNotification {
  id: string;
  kind: CashierNotificationKind;
  entityId: string;
  title: string;
  subtitle: string | null;
  /** Montant commande, unités transfert, ou quantité en stock */
  amount: number | null;
  receivedAt: string;
  read: boolean;
  audience?: NotificationAudience;
  storeId?: string;
  storeName?: string | null;
  productId?: string;
  /** Entrepôt hub (seuil 100) vs magasin retail (seuil 20). */
  isHubStore?: boolean;
  workflowStatus?: ShopifyWorkflowStatus;
  fromStoreId?: string;
  toStoreId?: string;
  fromStoreName?: string | null;
  toStoreName?: string | null;
  fromIsHub?: boolean;
  toIsHub?: boolean;
  transferPhase?: TransferPhase;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  /** Lien explicite si différent de la résolution par défaut. */
  href?: string;
}
