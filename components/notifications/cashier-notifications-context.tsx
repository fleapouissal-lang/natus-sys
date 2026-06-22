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
import { useRouter } from "next/navigation";
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
  unitCount: number | null
): CashierNotification {
  const entityId = row.id as string;
  return {
    id: notificationKey(entityId, "hub_transfer"),
    kind: "hub_transfer",
    entityId,
    title: "Envoi depuis l'entrepôt hub",
    subtitle: (row.notes as string | null)?.trim() || null,
    amount: unitCount,
    receivedAt: (row.sent_at as string) || new Date().toISOString(),
    read: false,
    audience: "store",
  };
}

export function CashierNotificationsProvider({
  scope,
  children,
}: {
  scope: NotificationScope;
  children: React.ReactNode;
}) {
  const router = useRouter();
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
    }) => {
      const result = evaluateStockChange({
        ...input,
        audience:
          input.audience ?? (scope.mode === "city" ? "city" : "store"),
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
        if (scope.mode === "city" && !cityStoreIdsRef.current.has(change.storeId)) {
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
      if (scope.mode === "city" && !cityStoreIdsRef.current.has(storeId)) return;

      const inventoryKey = stockInventoryKey(storeId, productId);
      const previousStock =
        oldRow?.stock != null
          ? Number(oldRow.stock)
          : lastStockRef.current.get(inventoryKey);
      const nextStock = Number(row.stock) || 0;

      const [productName, storeName] = await Promise.all([
        fetchProductName(productId),
        Promise.resolve(
          scope.mode === "city"
            ? storeNamesRef.current.get(storeId) ?? "Magasin"
            : null
        ),
      ]);

      applyStockEvaluation({
        storeId,
        productId,
        productName,
        storeName,
        previousStock,
        nextStock,
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

    async function bootstrapInventoryBaseline() {
      if (scope.mode === "city") {
        const { data: stores } = await supabase
          .from("stores")
          .select("id, name")
          .eq("city", scope.city)
          .eq("is_active", true)
          .eq("is_hub", false);

        if (cancelled) return;

        cityStoreIdsRef.current = new Set((stores || []).map((s) => s.id));
        storeNamesRef.current = new Map(
          (stores || []).map((s) => [s.id, s.name as string])
        );

        const storeIds = [...cityStoreIdsRef.current];
        if (storeIds.length === 0) return;

        const { data: rows } = await supabase
          .from("store_inventory")
          .select("store_id, product_id, stock")
          .in("store_id", storeIds);

        for (const row of rows || []) {
          lastStockRef.current.set(
            stockInventoryKey(row.store_id as string, row.product_id as string),
            Number(row.stock) || 0
          );
        }

        await syncStockAlertsFromRows(
          (rows || []).map((row) => ({
            store_id: row.store_id as string,
            product_id: row.product_id as string,
            stock: Number(row.stock) || 0,
          })),
          "city"
        );
        return;
      }

      const { data: rows } = await supabase
        .from("store_inventory")
        .select("store_id, product_id, stock")
        .eq("store_id", scope.storeId);

      for (const row of rows || []) {
        lastStockRef.current.set(
          stockInventoryKey(row.store_id as string, row.product_id as string),
          Number(row.stock) || 0
        );
      }

      await syncStockAlertsFromRows(
        (rows || []).map((row) => ({
          store_id: row.store_id as string,
          product_id: row.product_id as string,
          stock: Number(row.stock) || 0,
        })),
        "store"
      );
    }

    void bootstrapInventoryBaseline();

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
            router.refresh();
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
            router.refresh();
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
            if (row.status !== "sent") return;

            const id = notificationKey(row.id as string, "hub_transfer");
            if (seenEventIdsRef.current.has(id)) return;
            seenEventIdsRef.current.add(id);

            let unitCount: number | null = null;
            try {
              const { data } = await supabase
                .from("hub_stock_transfer_items")
                .select("quantity")
                .eq("transfer_id", row.id as string);
              if (data?.length) {
                unitCount = data.reduce(
                  (sum, item) => sum + (Number(item.quantity) || 0),
                  0
                );
              }
            } catch {
              // ignore
            }

            pushNotification(hubTransferToNotification(row, unitCount));
            router.refresh();
          }
        );
    }

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
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [scope, pushNotification, router, handleInventoryRow]);

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
    setBarVisible(false);
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
