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
  playNotificationSound,
  unlockNotificationAudio,
} from "@/lib/notifications/play-notification-sound";

export interface CashierOrderNotification {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string | null;
  total: number;
  receivedAt: string;
  read: boolean;
  kind: "new" | "transferred";
}

interface CashierNotificationsContextValue {
  notifications: CashierOrderNotification[];
  unreadCount: number;
  latestUnread: CashierOrderNotification | null;
  markAllRead: () => void;
  markRead: (id: string) => void;
  dismissBar: () => void;
  barVisible: boolean;
  openPanel: boolean;
  setOpenPanel: (open: boolean) => void;
}

const CashierNotificationsContext =
  createContext<CashierNotificationsContextValue | null>(null);

function rowToNotification(
  row: Record<string, unknown>,
  kind: CashierOrderNotification["kind"]
): CashierOrderNotification {
  return {
    id: `${row.id as string}-${Date.now()}`,
    orderId: row.id as string,
    orderNumber: (row.order_number as string) || "—",
    customerName: (row.customer_name as string | null) ?? null,
    total: Number(row.total) || 0,
    receivedAt: new Date().toISOString(),
    read: false,
    kind,
  };
}

export function CashierNotificationsProvider({
  storeId,
  children,
}: {
  storeId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<CashierOrderNotification[]>(
    []
  );
  const [barVisible, setBarVisible] = useState(false);
  const [openPanel, setOpenPanel] = useState(false);
  const seenOrderIdsRef = useRef<Set<string>>(new Set());

  const pushNotification = useCallback((notification: CashierOrderNotification) => {
    setNotifications((prev) => [notification, ...prev].slice(0, 30));
    setBarVisible(true);
    playNotificationSound();
  }, []);

  useEffect(() => {
    function unlockOnInteraction() {
      unlockNotificationAudio();
    }

    window.addEventListener("pointerdown", unlockOnInteraction, { once: true });
    window.addEventListener("keydown", unlockOnInteraction, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockOnInteraction);
      window.removeEventListener("keydown", unlockOnInteraction);
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`cashier-orders-${storeId}`)
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
          const orderId = row.id as string;
          if (seenOrderIdsRef.current.has(orderId)) return;
          seenOrderIdsRef.current.add(orderId);
          pushNotification(rowToNotification(row, "new"));
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
          const orderId = row.id as string;

          const transferred =
            oldRow.store_id != null &&
            oldRow.store_id !== storeId &&
            row.store_id === storeId;

          if (!transferred) return;
          if (seenOrderIdsRef.current.has(orderId)) return;
          seenOrderIdsRef.current.add(orderId);

          pushNotification(rowToNotification(row, "transferred"));
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [storeId, pushNotification, router]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const latestUnread = notifications.find((n) => !n.read) ?? null;

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setBarVisible(false);
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const dismissBar = useCallback(() => {
    setBarVisible(false);
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      latestUnread,
      markAllRead,
      markRead,
      dismissBar,
      barVisible,
      openPanel,
      setOpenPanel,
    }),
    [
      notifications,
      unreadCount,
      latestUnread,
      markAllRead,
      markRead,
      dismissBar,
      barVisible,
      openPanel,
    ]
  );

  return (
    <CashierNotificationsContext.Provider value={value}>
      {children}
    </CashierNotificationsContext.Provider>
  );
}

export function useCashierNotifications() {
  return useContext(CashierNotificationsContext);
}
