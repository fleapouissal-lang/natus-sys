"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  SESSION_ACTIVITY_THROTTLE_MS,
  SESSION_IDLE_CHECK_MS,
  SESSION_IDLE_TIMEOUT_MS,
  SESSION_LAST_ACTIVITY_KEY,
} from "@/lib/auth/session-config";
import { signOutPosOperator } from "@/lib/pos/actions";

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

function readLastActivity(): number {
  const raw = localStorage.getItem(SESSION_LAST_ACTIVITY_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

export function touchSessionActivity() {
  localStorage.setItem(SESSION_LAST_ACTIVITY_KEY, String(Date.now()));
}

export function SessionGuard({
  disableIdleLogout = false,
  isStorePos = false,
}: {
  disableIdleLogout?: boolean;
  isStorePos?: boolean;
}) {
  const router = useRouter();
  const signingOut = useRef(false);
  const lastTouch = useRef(0);

  useEffect(() => {
    if (disableIdleLogout) return;

    touchSessionActivity();

    async function logoutIdle() {
      if (signingOut.current) return;
      signingOut.current = true;

      if (isStorePos) {
        await signOutPosOperator();
      }

      const supabase = createClient();
      await supabase.auth.signOut();
      localStorage.removeItem(SESSION_LAST_ACTIVITY_KEY);
      router.push("/login");
      router.refresh();
    }

    function isIdle(): boolean {
      return Date.now() - readLastActivity() >= SESSION_IDLE_TIMEOUT_MS;
    }

    function maybeLogoutIdle() {
      if (isIdle()) {
        void logoutIdle();
      }
    }

    function recordActivity() {
      const now = Date.now();
      if (now - lastTouch.current < SESSION_ACTIVITY_THROTTLE_MS) return;
      lastTouch.current = now;
      touchSessionActivity();
    }

    if (isIdle()) {
      void logoutIdle();
      return;
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, recordActivity, { passive: true });
    }

    function onStorage(event: StorageEvent) {
      if (event.key === SESSION_LAST_ACTIVITY_KEY) {
        maybeLogoutIdle();
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        maybeLogoutIdle();
      }
    }

    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const intervalId = window.setInterval(maybeLogoutIdle, SESSION_IDLE_CHECK_MS);

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, recordActivity);
      }
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [router, disableIdleLogout, isStorePos]);

  return null;
}
