import type { ShopifyWorkflowStatus } from "@/lib/types";
import { workflowStatusLabel } from "@/lib/shopify/order-status";
import type {
  CashierNotification,
  CashierNotificationKind,
  NotificationAudience,
  TransferPhase,
} from "@/lib/notifications/types";

export function notificationKey(entityId: string, kind: CashierNotificationKind) {
  return `${entityId}-${kind}`;
}

export function orderStatusNotificationId(
  orderId: string,
  status: ShopifyWorkflowStatus
): string {
  return notificationKey(orderId, "order_status") + `-${status}`;
}

export function hubTransferPendingNotificationId(transferId: string): string {
  return notificationKey(`${transferId}-hub_transfer_pending`, "hub_transfer");
}

export function hubTransferSentNotificationId(transferId: string): string {
  return notificationKey(transferId, "hub_transfer_sent");
}

export function storeTransferNotificationId(
  transferId: string,
  phase: TransferPhase
): string {
  return notificationKey(transferId, "store_transfer") + `-${phase}`;
}

const ACTIONABLE_ORDER_STATUSES: ShopifyWorkflowStatus[] = [
  "pending",
  "preparing",
  "ready",
  "shipping",
  "delivered",
];

export function isActionableOrderStatus(
  status: string
): status is ShopifyWorkflowStatus {
  return ACTIONABLE_ORDER_STATUSES.includes(status as ShopifyWorkflowStatus);
}

export function orderRowToNotification(
  row: Record<string, unknown>,
  kind: "order_new" | "order_transferred",
  audience: NotificationAudience = "store"
): CashierNotification {
  const entityId = row.id as string;
  const workflowStatus = row.workflow_status as ShopifyWorkflowStatus | undefined;

  return {
    id: notificationKey(entityId, kind),
    kind,
    entityId,
    title: (row.order_number as string) || "—",
    subtitle: (row.customer_name as string | null) ?? null,
    amount: Number(row.total) || 0,
    receivedAt: new Date().toISOString(),
    read: false,
    audience,
    storeId: (row.store_id as string) || undefined,
    storeName: (row.store_name as string | null) ?? undefined,
    workflowStatus,
    category: "order",
    priority: kind === "order_new" ? "high" : "high",
  };
}

export function orderStatusChangeNotification(
  row: Record<string, unknown>,
  audience: NotificationAudience,
  storeName?: string | null
): CashierNotification {
  const entityId = row.id as string;
  const workflowStatus = row.workflow_status as ShopifyWorkflowStatus;
  const statusLabel = workflowStatusLabel(workflowStatus);

  return {
    id: orderStatusNotificationId(entityId, workflowStatus),
    kind: "order_status",
    entityId,
    title: (row.order_number as string) || "—",
    subtitle: [
      (row.customer_name as string | null) ?? null,
      storeName,
      statusLabel,
    ]
      .filter(Boolean)
      .join(" · "),
    amount: Number(row.total) || 0,
    receivedAt: new Date().toISOString(),
    read: false,
    audience,
    storeId: (row.store_id as string) || undefined,
    storeName: storeName ?? undefined,
    workflowStatus,
    category: "order",
    priority:
      workflowStatus === "pending" || workflowStatus === "ready"
        ? "high"
        : "normal",
  };
}

function transferRouteLabel(
  fromName: string | null | undefined,
  toName: string | null | undefined
): string | null {
  if (!fromName && !toName) return null;
  return `${fromName ?? "Origine"} → ${toName ?? "Destination"}`;
}

export function hubTransferToNotification(
  row: Record<string, unknown>,
  unitCount: number | null,
  audience: NotificationAudience,
  options: {
    toIsHub?: boolean;
    fromIsHub?: boolean;
    titleOverride?: string;
    fromStoreName?: string | null;
    toStoreName?: string | null;
    phase?: TransferPhase;
  } = {}
): CashierNotification {
  const entityId = row.id as string;
  const toIsHub = options.toIsHub ?? false;
  const fromIsHub = options.fromIsHub ?? false;
  const phase = options.phase ?? "received";
  const route = transferRouteLabel(options.fromStoreName, options.toStoreName);

  return {
    id: hubTransferPendingNotificationId(entityId),
    kind: "hub_transfer",
    entityId,
    title:
      options.titleOverride ??
      (toIsHub
        ? "Réception dépôt attendue"
        : "Transfert dépôt à recevoir"),
    subtitle: route ?? ((row.notes as string | null)?.trim() || null),
    amount: unitCount,
    receivedAt: (row.sent_at as string) || new Date().toISOString(),
    read: false,
    audience,
    fromStoreId: (row.from_store_id as string) || undefined,
    toStoreId: (row.to_store_id as string) || undefined,
    fromStoreName: options.fromStoreName ?? undefined,
    toStoreName: options.toStoreName ?? undefined,
    fromIsHub,
    toIsHub,
    transferPhase: phase,
    category: "transfer",
    priority: phase === "received" ? "high" : "normal",
  };
}

export function hubTransferSentNotification(
  row: Record<string, unknown>,
  unitCount: number | null,
  audience: NotificationAudience,
  fromStoreName: string | null,
  toStoreName: string | null,
  options: { fromIsHub?: boolean; toIsHub?: boolean } = {}
): CashierNotification {
  const entityId = row.id as string;
  const route = transferRouteLabel(fromStoreName, toStoreName);

  return {
    id: hubTransferSentNotificationId(entityId),
    kind: "hub_transfer_sent",
    entityId,
    title: "Transfert dépôt envoyé",
    subtitle: route,
    amount: unitCount,
    receivedAt: (row.sent_at as string) || new Date().toISOString(),
    read: false,
    audience,
    fromStoreId: (row.from_store_id as string) || undefined,
    toStoreId: (row.to_store_id as string) || undefined,
    fromStoreName: fromStoreName ?? undefined,
    toStoreName: toStoreName ?? undefined,
    fromIsHub: options.fromIsHub ?? false,
    toIsHub: options.toIsHub ?? false,
    transferPhase: "sent",
    category: "transfer",
    priority: "normal",
  };
}

export function storeTransferToNotification(
  row: Record<string, unknown>,
  unitCount: number | null,
  audience: NotificationAudience,
  phase: TransferPhase,
  fromStoreName: string | null,
  toStoreName: string | null,
  perspectiveStoreId?: string,
  options: { fromIsHub?: boolean; toIsHub?: boolean } = {}
): CashierNotification {
  const entityId = row.id as string;
  const route = transferRouteLabel(fromStoreName, toStoreName);
  const isReceived = phase === "received";

  let title = "Transfert magasin envoyé";
  if (isReceived) {
    title =
      perspectiveStoreId === row.to_store_id
        ? "Transfert magasin à recevoir"
        : "Transfert magasin en réception";
  }

  return {
    id: storeTransferNotificationId(entityId, phase),
    kind: "store_transfer",
    entityId,
    title,
    subtitle: route ?? ((row.notes as string | null)?.trim() || null),
    amount: unitCount,
    receivedAt: (row.sent_at as string) || new Date().toISOString(),
    read: false,
    audience,
    fromStoreId: (row.from_store_id as string) || undefined,
    toStoreId: (row.to_store_id as string) || undefined,
    fromStoreName: fromStoreName ?? undefined,
    toStoreName: toStoreName ?? undefined,
    fromIsHub: options.fromIsHub ?? false,
    toIsHub: options.toIsHub ?? false,
    transferPhase: phase,
    category: "transfer",
    priority: isReceived ? "high" : "normal",
  };
}
