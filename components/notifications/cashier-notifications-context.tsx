"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  loadCashierNotifications,
  saveCashierNotifications,
} from "@/lib/notifications/cashier-notifications-storage";
import {
  notificationChannelId,
  notificationStorageKey,
  type NotificationScope,
} from "@/lib/notifications/notification-scope";
import { notificationSoundKind } from "@/lib/notifications/display";
import {
  playNotificationSound,
  unlockNotificationAudio,
} from "@/lib/notifications/play-notification-sound";
import {
  requestBrowserNotificationPermission,
  showBrowserOrderNotification,
} from "@/lib/notifications/show-browser-notification";
import { evaluateStockChange, type StockChangeInput } from "@/lib/notifications/process-stock-change";
import {
  fetchStoreInventoryAlertRows,
  fetchStoreInventoryRows,
} from "@/lib/notifications/fetch-store-inventory-alerts";
import {
  mergeActiveStockAlerts,
  stockAlertsChanged,
} from "@/lib/notifications/sync-stock-alerts";
import {
  stockInventoryKey,
} from "@/lib/notifications/stock-alert";
import {
  computeNotificationCounts,
  hasNotificationAttention,
  isStockAlertNotification,
  latestAttentionNotification,
} from "@/lib/notifications/notification-counts";
import { CashierNotificationToasts } from "@/components/notifications/cashier-notification-toasts";

import type {
  CashierNotification,
  NotificationAudience,
} from "@/lib/notifications/types";

export type { CashierNotification, CashierOrderNotification } from "@/lib/notifications/types";

const TOAST_DURATION_MS = 8000;
const MAX_TOASTS = 3;
const REFRESH_DEBOUNCE_MS = 3000;
const REFRESH_MIN_INTERVAL_MS = 15_000;

const REFRESH_PATH_PREFIXES = [
  "/cashier/orders",
  "/manager/orders",
  "/manager/stock-transfers",
  "/director/stock-transfers",
  "/cashier/transfers",
  "/hub/stock-transfers",
  "/hub/orders",
  "/manager/hub-orders",
  "/livreur/transfers",
  "/livreur/orders",
];

function shouldRefreshRoute(pathname: string): boolean {
  if (pathname.startsWith("/cashier/pos")) return false;
  return REFRESH_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

interface CashierNotificationsContextValue {
  notifications: CashierNotification[];
  toasts: CashierNotification[];
  unreadCount: number;
  badgeCount: number;
  stockAlertCount: number;
  latestUnread: CashierNotification | null;
  markAllRead: () => void;
  markRead: (id: string) => void;
  openNotification: (id: string) => void;
  dismissToast: (id: string) => void;
  dismissBar: () => void;
  barVisible: boolean;
  openPanel: boolean;
  setOpenPanel: (open: boolean) => void;
  setNotificationOpenHandler: (
    handler: ((notification: CashierNotification) => void) | null
  ) => void;
  /** Déclenchement immédiat après vente (ne dépend pas du realtime Supabase). */
  reportStockChanges: (changes: StockChangeInput[]) => void;
}

const CashierNotificationsContext =
  createContext<CashierNotificationsContextValue | null>(null);

function notificationKey(entityId: string, kind: CashierNotification["kind"]) {
  return `${entityId}-${kind}`;
}

function orderRowToNotification(
  row: Record<string, unknown>,
  kind: "order_new" | "order_transferred"
): CashierNotification {
  const entityId = row.id as string;
  return {
    id: notificationKey(entityId, kind),
    kind,
    entityId,
    title: (row.order_number as string) || "—",
    subtitle: (row.customer_name as string | null) ?? null,
    amount: Number(row.total) || 0,
    receivedAt: new Date().toISOString(),
    read: false,
    audience: "store",
  };
}

function hubTransferToNotification(
  row: Record<string, unknown>,
  unitCount: number | null,
  title = "Commande dépôt",
  audience: NotificationAudience = "store"
): CashierNotification {
  const entityId = row.id as string;
  const status = row.status as string;
  const idSuffix =
    status === "livre" ? "hub_transfer_validate" : "hub_transfer_order";
  return {
    id: notificationKey(`${entityId}-${idSuffix}`, "hub_transfer"),
    kind: "hub_transfer",
    entityId,
    title:
      title ||
      (status === "livre"
        ? "Livraison à valider"
        : status === "en_cours"
          ? "Commande dépôt en cours"
          : "Commande dépôt"),
    subtitle: (row.notes as string | null)?.trim() || null,
    amount: unitCount,
    receivedAt: (row.sent_at as string) || new Date().toISOString(),
    read: false,
    audience,
  };
}

function scopeAudience(scope: NotificationScope): NotificationAudience {
  switch (scope.mode) {
    case "city":
      return "city";
    case "director":
      return "director";
    case "hub":
      return "hub";
    case "livreur":
      return "livreur";
    default:
      return "store";
  }
}

async function fetchHubTransferUnitCount(
  supabase: ReturnType<typeof createClient>,
  transferId: string
): Promise<number | null> {
  try {
    const { data } = await supabase
      .from("hub_stock_transfer_items")
      .select("quantity")
      .eq("transfer_id", transferId);
    if (!data?.length) return null;
    return data.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  } catch {
    return null;
  }
}

export function CashierNotificationsProvider({
  scope,
  children,
}: {
  scope: NotificationScope;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRefreshAtRef = useRef(0);
  const storageKey = notificationStorageKey(scope);
  const [notifications, setNotifications] = useState<CashierNotification[]>([]);
  const [toasts, setToasts] = useState<CashierNotification[]>([]);
  const [barVisible, setBarVisible] = useState(false);
  const [openPanel, setOpenPanel] = useState(false);
  const seenEventIdsRef = useRef<Set<string>>(new Set());
  const lastStockRef = useRef<Map<string, number>>(new Map());
  const productNamesRef = useRef<Map<string, string>>(new Map());
  const storeNamesRef = useRef<Map<string, string>>(new Map());
  const cityStoreIdsRef = useRef<Set<string>>(new Set());
  const monitoredStoreIdsRef = useRef<Set<string>>(new Set());
  const storeIsHubRef = useRef<Map<string, boolean>>(new Map());
  const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const openHandlerRef = useRef<
    ((notification: CashierNotification) => void) | null
  >(null);

  const persist = useCallback(
    (next: CashierNotification[]) => {
      saveCashierNotifications(storageKey, next);
    },
    [storageKey]
  );

  const scheduleRouterRefresh = useCallback(() => {
    if (!shouldRefreshRoute(pathname)) return;

    const now = Date.now();
    if (now - lastRefreshAtRef.current < REFRESH_MIN_INTERVAL_MS) return;

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      lastRefreshAtRef.current = Date.now();
      router.refresh();
    }, REFRESH_DEBOUNCE_MS);
  }, [router, pathname]);

  const scheduleToastDismiss = useCallback((id: string) => {
    const existing = toastTimersRef.current.get(id);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      toastTimersRef.current.delete(id);
    }, TOAST_DURATION_MS);

    toastTimersRef.current.set(id, timer);
  }, []);

  const addToast = useCallback(
    (notification: CashierNotification) => {
      setToasts((prev) => {
        const filtered = prev.filter((t) => t.id !== notification.id);
        return [notification, ...filtered].slice(0, MAX_TOASTS);
      });
      scheduleToastDismiss(notification.id);
    },
    [scheduleToastDismiss]
  );

  const dismissToast = useCallback((id: string) => {
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearStockAlerts = useCallback(
    (storeId: string, productId: string) => {
      setNotifications((prev) => {
        const next = prev.filter(
          (n) =>
            !(
              isStockAlertNotification(n) &&
              n.storeId === storeId &&
              n.productId === productId
            )
        );
        if (next.length === prev.length) return prev;
        persist(next);
        setBarVisible(hasNotificationAttention(next));
        return next;
      });
    },
    [persist]
  );

  const pushNotification = useCallback(
    (notification: CashierNotification) => {
      let added = false;

      setNotifications((prev) => {
        const duplicateUnread = prev.some(
          (n) => n.id === notification.id && !n.read
        );
        if (duplicateUnread) return prev;

        added = true;
        const filtered = prev.filter((n) => n.id !== notification.id);
        const next = [notification, ...filtered].slice(0, 50);
        persist(next);
        return next;
      });

      if (!added) return;

      setBarVisible(true);
      addToast(notification);
      playNotificationSound(notificationSoundKind(notification.kind));
      showBrowserOrderNotification(notification);
    },
    [addToast, persist]
  );

  const fetchProductName = useCallback(async (productId: string) => {
    const cached = productNamesRef.current.get(productId);
    if (cached) return cached;

    const supabase = createClient();
    const { data } = await supabase
      .from("products")
      .select("name")
      .eq("id", productId)
      .maybeSingle();

    const name = data?.name || "Produit";
    productNamesRef.current.set(productId, name);
    return name;
  }, []);

  const applyStockEvaluation = useCallback(
    (input: {
      storeId: string;
      productId: string;
      productName: string;
      storeName?: string | null;
      previousStock: number | null | undefined;
      nextStock: number;
      audience?: CashierNotification["audience"];
      isHub?: boolean;
    }) => {
      const result = evaluateStockChange({
        ...input,
        audience: input.audience ?? scopeAudience(scope),
        isHub: input.isHub ?? storeIsHubRef.current.get(input.storeId) ?? false,
      });

      lastStockRef.current.set(result.inventoryKey, input.nextStock);

      if (result.shouldResolve) {
        clearStockAlerts(input.storeId, input.productId);
        return;
      }

      if (result.notification) {
        pushNotification(result.notification);
      }
    },
    [pushNotification, clearStockAlerts, scope.mode]
  );

  const reportStockChanges = useCallback(
    (changes: StockChangeInput[]) => {
      for (const change of changes) {
        if (scope.mode === "store" && change.storeId !== scope.storeId) continue;
        if (scope.mode === "hub" && change.storeId !== scope.hubStoreId) continue;
        if (scope.mode === "city" && !cityStoreIdsRef.current.has(change.storeId)) {
          continue;
        }
        if (
          scope.mode === "director" &&
          !monitoredStoreIdsRef.current.has(change.storeId)
        ) {
          continue;
        }

        applyStockEvaluation({
          storeId: change.storeId,
          productId: change.productId,
          productName: change.productName,
          storeName: change.storeName,
          previousStock: change.previousStock,
          nextStock: change.nextStock,
          audience: change.audience,
          isHub: change.isHub,
        });
      }
    },
    [applyStockEvaluation, scope]
  );

  const handleInventoryRow = useCallback(
    async (
      row: Record<string, unknown>,
      oldRow: Record<string, unknown> | undefined
    ) => {
      const storeId = row.store_id as string;
      const productId = row.product_id as string;
      if (!storeId || !productId) return;

      if (scope.mode === "store" && storeId !== scope.storeId) return;
      if (scope.mode === "hub" && storeId !== scope.hubStoreId) return;
      if (scope.mode === "city" && !cityStoreIdsRef.current.has(storeId)) return;
      if (scope.mode === "director" && !monitoredStoreIdsRef.current.has(storeId)) {
        return;
      }

      const inventoryKey = stockInventoryKey(storeId, productId);
      const previousStock =
        oldRow?.stock != null
          ? Number(oldRow.stock)
          : lastStockRef.current.get(inventoryKey);
      const nextStock = Number(row.stock) || 0;
      const isHub = storeIsHubRef.current.get(storeId) ?? false;

      const [productName, storeName] = await Promise.all([
        fetchProductName(productId),
        Promise.resolve(storeNamesRef.current.get(storeId) ?? null),
      ]);

      applyStockEvaluation({
        storeId,
        productId,
        productName,
        storeName,
        previousStock,
        nextStock,
        isHub,
      });
    },
    [applyStockEvaluation, fetchProductName, scope]
  );

  useEffect(() => {
    const stored = loadCashierNotifications(storageKey);
    for (const n of stored) {
      if (n.kind !== "stock_low" && n.kind !== "stock_out") {
        seenEventIdsRef.current.add(n.id);
      }
    }
    setNotifications(stored);
    setBarVisible(hasNotificationAttention(stored));
  }, [storageKey]);

  useEffect(() => {
    if (notifications.some(isStockAlertNotification)) {
      setBarVisible(true);
    }
  }, [notifications]);

  useEffect(() => {
    function unlockOnInteraction() {
      unlockNotificationAudio();
      void requestBrowserNotificationPermission();
    }

    window.addEventListener("pointerdown", unlockOnInteraction, { once: true });
    window.addEventListener("keydown", unlockOnInteraction, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockOnInteraction);
      window.removeEventListener("keydown", unlockOnInteraction);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      for (const timer of toastTimersRef.current.values()) {
        clearTimeout(timer);
      }
      toastTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function syncStockAlertsFromRows(
      rows: { store_id: string; product_id: string; stock: number }[],
      audience: NotificationAudience
    ) {
      if (cancelled || rows.length === 0) return;

      const productIds = [...new Set(rows.map((r) => r.product_id))];
      const { data: products } = await supabase
        .from("products")
        .select("id, name")
        .in("id", productIds);

      if (cancelled) return;

      const nameById = new Map(
        (products || []).map((p) => [p.id as string, p.name as string])
      );

      const inventory = rows.map((row) => ({
        storeId: row.store_id,
        productId: row.product_id,
        stock: Number(row.stock) || 0,
        productName: nameById.get(row.product_id) || "Produit",
        storeName: storeNamesRef.current.get(row.store_id) ?? null,
        isHub: storeIsHubRef.current.get(row.store_id) ?? false,
      }));

      setNotifications((prev) => {
        const next = mergeActiveStockAlerts({
          notifications: prev,
          inventory,
          audience,
        });
        if (!stockAlertsChanged(prev, next)) return prev;
        persist(next);
        setBarVisible(hasNotificationAttention(next));
        return next;
      });
    }

    function seedLastStockFromRows(
      rows: { store_id: string; product_id: string; stock: number }[]
    ) {
      for (const row of rows) {
        lastStockRef.current.set(
          stockInventoryKey(row.store_id, row.product_id),
          row.stock
        );
      }
    }

    async function bootstrapLivreurAssignments() {
      if (scope.mode !== "livreur") return;

      const pendingNotifications: CashierNotification[] = [];

      const { data: transfers } = await supabase
        .from("hub_stock_transfers")
        .select(
          "id, status, notes, sent_at, to_store_id, from_store_id, to_store:to_store_id(name, is_hub), from_store:from_store_id(name, is_hub)"
        )
        .eq("assigned_livreur_id", scope.livreurId)
        .in("status", ["pret", "en_livraison"]);

      if (cancelled) return;

      for (const row of transfers || []) {
        if ((row.status as string) !== "pret") continue;
        const toStore = Array.isArray(row.to_store) ? row.to_store[0] : row.to_store;
        const fromStore = Array.isArray(row.from_store) ? row.from_store[0] : row.from_store;
        const isReturn = Boolean(toStore?.is_hub);
        pendingNotifications.push(
          hubTransferToNotification(
            row as Record<string, unknown>,
            null,
            isReturn ? "Retour à transférer au dépôt" : "Commande hub à livrer",
            "livreur"
          )
        );
      }

      const { data: orders } = await supabase
        .from("shopify_orders")
        .select("id, order_number, customer_name, total, workflow_status, updated_at")
        .eq("assigned_livreur_id", scope.livreurId)
        .in("workflow_status", ["ready", "shipping"]);

      if (cancelled) return;

      for (const row of orders || []) {
        const kind =
          row.workflow_status === "shipping" ? "order_transferred" : "order_new";
        pendingNotifications.push({
          ...orderRowToNotification(row as Record<string, unknown>, kind),
          audience: "livreur",
        });
      }

      if (pendingNotifications.length === 0) return;

      setNotifications((prev) => {
        const byId = new Map(prev.map((n) => [n.id, n]));
        for (const notification of pendingNotifications) {
          if (!byId.has(notification.id)) byId.set(notification.id, notification);
        }
        const next = [...byId.values()].sort(
          (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
        );
        persist(next.slice(0, 80));
        setBarVisible(hasNotificationAttention(next));
        return next.slice(0, 80);
      });
    }

    async function bootstrapInventoryBaseline() {
      if (scope.mode === "livreur") {
        await bootstrapLivreurAssignments();
        return;
      }

      if (scope.mode === "director") {
        const { data: stores } = await supabase
          .from("stores")
          .select("id, name, is_hub")
          .eq("is_active", true);

        if (cancelled) return;

        const storeList = stores || [];
        monitoredStoreIdsRef.current = new Set(storeList.map((s) => s.id as string));
        storeNamesRef.current = new Map(
          storeList.map((s) => [s.id as string, s.name as string])
        );
        storeIsHubRef.current = new Map(
          storeList.map((s) => [s.id as string, Boolean(s.is_hub)])
        );

        if (monitoredStoreIdsRef.current.size === 0) return;

        const rows = await fetchStoreInventoryAlertRows(
          supabase,
          storeList.map((s) => ({ id: s.id as string, is_hub: s.is_hub }))
        );
        if (cancelled) return;

        seedLastStockFromRows(rows);
        await syncStockAlertsFromRows(rows, "director");
        return;
      }

      if (scope.mode === "hub") {
        storeIsHubRef.current.set(scope.hubStoreId, true);
        monitoredStoreIdsRef.current = new Set([scope.hubStoreId]);

        const rows = await fetchStoreInventoryRows(supabase, scope.hubStoreId);
        if (cancelled) return;

        seedLastStockFromRows(rows);
        await syncStockAlertsFromRows(rows, "hub");
        return;
      }

      if (scope.mode === "city") {
        const { data: stores } = await supabase
          .from("stores")
          .select("id, name, is_hub")
          .eq("city", scope.city)
          .eq("is_active", true)
          .eq("is_hub", false);

        if (cancelled) return;

        const storeList = stores || [];
        cityStoreIdsRef.current = new Set(storeList.map((s) => s.id as string));
        storeNamesRef.current = new Map(
          storeList.map((s) => [s.id as string, s.name as string])
        );
        storeIsHubRef.current = new Map(
          storeList.map((s) => [s.id as string, Boolean(s.is_hub)])
        );

        if (cityStoreIdsRef.current.size === 0) return;

        const rows = await fetchStoreInventoryAlertRows(
          supabase,
          storeList.map((s) => ({ id: s.id as string, is_hub: false }))
        );
        if (cancelled) return;

        seedLastStockFromRows(rows);
        await syncStockAlertsFromRows(rows, "city");
        return;
      }

      storeIsHubRef.current.set(scope.storeId, false);
      monitoredStoreIdsRef.current = new Set([scope.storeId]);

      const rows = await fetchStoreInventoryRows(supabase, scope.storeId);
      if (cancelled) return;

      seedLastStockFromRows(rows);
      await syncStockAlertsFromRows(rows, "store");
    }

    async function startRealtime() {
      await bootstrapInventoryBaseline();
      if (cancelled) return;

      const channel = supabase.channel(`natus-events-${notificationChannelId(scope)}`);

    if (scope.mode === "store") {
      const { storeId } = scope;

      channel
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "shopify_orders",
            filter: `store_id=eq.${storeId}`,
          },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            const id = notificationKey(row.id as string, "order_new");
            if (seenEventIdsRef.current.has(id)) return;
            seenEventIdsRef.current.add(id);
            pushNotification(orderRowToNotification(row, "order_new"));
            scheduleRouterRefresh();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "shopify_orders",
            filter: `store_id=eq.${storeId}`,
          },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            const oldRow = payload.old as Record<string, unknown>;

            const transferred =
              oldRow.store_id != null &&
              oldRow.store_id !== storeId &&
              row.store_id === storeId;

            if (!transferred) return;

            const id = notificationKey(row.id as string, "order_transferred");
            if (seenEventIdsRef.current.has(id)) return;
            seenEventIdsRef.current.add(id);

            pushNotification(orderRowToNotification(row, "order_transferred"));
            scheduleRouterRefresh();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "hub_stock_transfers",
            filter: `to_store_id=eq.${storeId}`,
          },
          async (payload) => {
            const row = payload.new as Record<string, unknown>;
            if (row.status !== "en_cours") return;

            const id = notificationKey(`${row.id as string}-hub_transfer_order`, "hub_transfer");
            if (seenEventIdsRef.current.has(id)) return;
            seenEventIdsRef.current.add(id);

            const unitCount = await fetchHubTransferUnitCount(
              supabase,
              row.id as string
            );

            pushNotification(
              hubTransferToNotification(row, unitCount, "Commande dépôt reçue")
            );
            scheduleRouterRefresh();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "hub_stock_transfers",
            filter: `to_store_id=eq.${storeId}`,
          },
          async (payload) => {
            const row = payload.new as Record<string, unknown>;
            const oldRow = payload.old as Record<string, unknown>;
            const becameDelivered =
              row.status === "livre" && oldRow.status !== "livre";

            if (!becameDelivered) return;

            const id = notificationKey(`${row.id as string}-hub_transfer_validate`, "hub_transfer");
            if (seenEventIdsRef.current.has(id)) return;
            seenEventIdsRef.current.add(id);

            const unitCount = await fetchHubTransferUnitCount(
              supabase,
              row.id as string
            );

            pushNotification(
              hubTransferToNotification(
                row,
                unitCount,
                "Livraison dépôt à valider",
                "store"
              )
            );
            scheduleRouterRefresh();
          }
        );
    }

    if (scope.mode === "city") {
      channel
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "hub_stock_transfers",
          },
          async (payload) => {
            const row = payload.new as Record<string, unknown>;
            const toStoreId = row.to_store_id as string;
            if (!cityStoreIdsRef.current.has(toStoreId)) return;
            if (row.status !== "en_cours") return;

            const id = notificationKey(`${row.id as string}-hub_transfer_order`, "hub_transfer");
            if (seenEventIdsRef.current.has(id)) return;
            seenEventIdsRef.current.add(id);

            const unitCount = await fetchHubTransferUnitCount(
              supabase,
              row.id as string
            );

            pushNotification(
              hubTransferToNotification(
                row,
                unitCount,
                "Commande dépôt vers un magasin",
                "city"
              )
            );
            scheduleRouterRefresh();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "hub_stock_transfers",
          },
          async (payload) => {
            const row = payload.new as Record<string, unknown>;
            const oldRow = payload.old as Record<string, unknown>;
            const toStoreId = row.to_store_id as string;
            if (!cityStoreIdsRef.current.has(toStoreId)) return;

            const becameDelivered =
              row.status === "livre" && oldRow.status !== "livre";
            if (!becameDelivered) return;

            const id = notificationKey(`${row.id as string}-hub_transfer_validate`, "hub_transfer");
            if (seenEventIdsRef.current.has(id)) return;
            seenEventIdsRef.current.add(id);

            const unitCount = await fetchHubTransferUnitCount(
              supabase,
              row.id as string
            );

            pushNotification(
              hubTransferToNotification(
                row,
                unitCount,
                "Livraison dépôt à valider en magasin",
                "city"
              )
            );
            scheduleRouterRefresh();
          }
        );
    }

    if (scope.mode === "livreur") {
      const { livreurId } = scope;

      channel
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "hub_stock_transfers",
            filter: `assigned_livreur_id=eq.${livreurId}`,
          },
          async (payload) => {
            const row = payload.new as Record<string, unknown>;
            if (row.status !== "pret") return;

            const id = notificationKey(`${row.id as string}-hub_transfer_order`, "hub_transfer");
            if (seenEventIdsRef.current.has(id)) return;
            seenEventIdsRef.current.add(id);

            const unitCount = await fetchHubTransferUnitCount(
              supabase,
              row.id as string
            );

            pushNotification(
              hubTransferToNotification(
                row,
                unitCount,
                "Nouveau transfert assigné",
                "livreur"
              )
            );
            scheduleRouterRefresh();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "hub_stock_transfers",
            filter: `assigned_livreur_id=eq.${livreurId}`,
          },
          async (payload) => {
            const row = payload.new as Record<string, unknown>;
            const oldRow = payload.old as Record<string, unknown>;
            const becameReady =
              row.status === "pret" &&
              oldRow.status !== "pret" &&
              row.assigned_livreur_id === livreurId;

            if (!becameReady) return;

            const id = notificationKey(`${row.id as string}-hub_transfer_order`, "hub_transfer");
            if (seenEventIdsRef.current.has(id)) return;
            seenEventIdsRef.current.add(id);

            const unitCount = await fetchHubTransferUnitCount(
              supabase,
              row.id as string
            );

            pushNotification(
              hubTransferToNotification(
                row,
                unitCount,
                "Transfert prêt à récupérer",
                "livreur"
              )
            );
            scheduleRouterRefresh();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "shopify_orders",
            filter: `assigned_livreur_id=eq.${livreurId}`,
          },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            const oldRow = payload.old as Record<string, unknown>;

            const newlyAssigned =
              row.assigned_livreur_id === livreurId &&
              oldRow.assigned_livreur_id !== livreurId;
            const becameShipping =
              row.workflow_status === "shipping" &&
              oldRow.workflow_status !== "shipping";

            if (!newlyAssigned && !becameShipping) return;

            const kind = becameShipping ? "order_transferred" : "order_new";
            const id = notificationKey(row.id as string, kind);
            if (seenEventIdsRef.current.has(id)) return;
            seenEventIdsRef.current.add(id);

            pushNotification({
              ...orderRowToNotification(row, kind),
              audience: "livreur",
            });
            scheduleRouterRefresh();
          }
        );
    }

    if (scope.mode !== "livreur") {
      channel
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "store_inventory",
          },
          (payload) => {
            void handleInventoryRow(
              payload.new as Record<string, unknown>,
              undefined
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "store_inventory",
          },
          (payload) => {
            void handleInventoryRow(
              payload.new as Record<string, unknown>,
              payload.old as Record<string, unknown>
            );
          }
        );
    }

    channel.subscribe();

      return channel;
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;

    void startRealtime().then((subscribedChannel) => {
      if (cancelled) {
        if (subscribedChannel) void supabase.removeChannel(subscribedChannel);
        return;
      }
      channel = subscribedChannel ?? null;
    });

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [scope, pushNotification, scheduleRouterRefresh, handleInventoryRow]);

  const { badgeCount, otherUnreadCount, stockAlertCount } = useMemo(
    () => computeNotificationCounts(notifications),
    [notifications]
  );
  const unreadCount = otherUnreadCount;
  const latestUnread = latestAttentionNotification(notifications);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) =>
        isStockAlertNotification(n) ? n : { ...n, read: true }
      );
      persist(next);
      setBarVisible(hasNotificationAttention(next));
      return next;
    });
    setToasts([]);
    for (const timer of toastTimersRef.current.values()) {
      clearTimeout(timer);
    }
    toastTimersRef.current.clear();
  }, [persist]);

  const markRead = useCallback(
    (id: string) => {
      setNotifications((prev) => {
        const target = prev.find((n) => n.id === id);
        if (!target || isStockAlertNotification(target)) return prev;

        const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
        persist(next);
        setBarVisible(hasNotificationAttention(next));
        return next;
      });
      dismissToast(id);
    },
    [dismissToast, persist]
  );

  const openNotification = useCallback(
    (id: string) => {
      const notification = notifications.find((n) => n.id === id);
      if (!notification) return;

      if (!isStockAlertNotification(notification)) {
        markRead(id);
      } else {
        dismissToast(id);
      }
      setOpenPanel(false);
      openHandlerRef.current?.(notification);
    },
    [dismissToast, markRead, notifications]
  );

  const dismissBar = useCallback(() => {
    setNotifications((prev) => {
      if (prev.some(isStockAlertNotification)) {
        setBarVisible(true);
        return prev;
      }
      setBarVisible(false);
      return prev;
    });
  }, []);

  const setNotificationOpenHandler = useCallback(
    (handler: ((notification: CashierNotification) => void) | null) => {
      openHandlerRef.current = handler;
    },
    []
  );

  const value = useMemo(
    () => ({
      notifications,
      toasts,
      unreadCount,
      badgeCount,
      stockAlertCount,
      latestUnread,
      markAllRead,
      markRead,
      openNotification,
      dismissToast,
      dismissBar,
      barVisible,
      openPanel,
      setOpenPanel,
      setNotificationOpenHandler,
      reportStockChanges,
    }),
    [
      notifications,
      toasts,
      unreadCount,
      badgeCount,
      stockAlertCount,
      latestUnread,
      markAllRead,
      markRead,
      openNotification,
      dismissToast,
      dismissBar,
      barVisible,
      openPanel,
      setNotificationOpenHandler,
      reportStockChanges,
    ]
  );

  return (
    <CashierNotificationsContext.Provider value={value}>
      {children}
      <CashierNotificationToasts />
    </CashierNotificationsContext.Provider>
  );
}

export function useCashierNotifications() {
  return useContext(CashierNotificationsContext);
}
