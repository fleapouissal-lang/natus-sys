"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Tables suivies en temps réel. Toute modification (INSERT/UPDATE/DELETE) sur
 * l'une d'elles déclenche un rafraîchissement des données de la page (via
 * router.refresh()), sans recharger entièrement la page ni perdre l'état des
 * composants client. La liste doit rester alignée avec les tables publiées dans
 * la publication `supabase_realtime` (voir migrations 027 / 054 / 164).
 */
const REALTIME_TABLES = [
  "shopify_orders",
  "store_inventory",
  "hub_stock_transfers",
  "store_stock_transfers",
  "sales",
  "sale_cheques",
  "store_day_closures",
  "store_complaints",
  "store_product_writeoffs",
  "store_planning_cashiers",
] as const;

const DEBOUNCE_MS = 600;
const MIN_INTERVAL_MS = 2500;

/**
 * Rafraîchissement automatique des pages sur changement de la base de données.
 * Monté une seule fois dans le shell — couvre tous les rôles et toutes les pages
 * (sauf l'écran de caisse en cours de vente).
 */
export function RealtimeRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRefreshAtRef = useRef(0);
  const pendingWhileHiddenRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    function runRefresh() {
      lastRefreshAtRef.current = Date.now();
      pendingWhileHiddenRef.current = false;
      router.refresh();
    }

    function scheduleRefresh() {
      // Ne pas perturber une vente en cours à la caisse.
      if (pathnameRef.current?.startsWith("/cashier/pos")) return;

      // Onglet en arrière-plan : on note qu'un refresh est nécessaire et on
      // l'effectuera au retour de l'onglet.
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        pendingWhileHiddenRef.current = true;
        return;
      }

      const now = Date.now();
      const elapsed = now - lastRefreshAtRef.current;
      const wait = Math.max(DEBOUNCE_MS, MIN_INTERVAL_MS - elapsed);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        runRefresh();
      }, wait);
    }

    const channel = supabase.channel("natus-realtime-refresh");
    for (const table of REALTIME_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        scheduleRefresh
      );
    }
    channel.subscribe();

    function handleVisibility() {
      if (document.visibilityState === "visible" && pendingWhileHiddenRef.current) {
        scheduleRefresh();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
