"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type NetworkQuality = "good" | "unstable" | "offline";

const PING_INTERVAL_MS = 25_000;
const PING_TIMEOUT_MS = 8_000;
const FAILURE_THRESHOLD = 2;
const SLOW_RESPONSE_MS = 4_000;

type NetworkInformation = {
  effectiveType?: string;
  rtt?: number;
  downlink?: number;
  saveData?: boolean;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

function getNavigatorConnection(): NetworkInformation | undefined {
  return (navigator as Navigator & { connection?: NetworkInformation })
    .connection;
}

function readConnectionHint(): NetworkQuality | null {
  const connection = getNavigatorConnection();
  if (!connection) return null;

  if (connection.saveData) return "unstable";
  if (
    connection.effectiveType === "slow-2g" ||
    connection.effectiveType === "2g"
  ) {
    return "unstable";
  }
  if (typeof connection.rtt === "number" && connection.rtt > 800) {
    return "unstable";
  }
  if (
    typeof connection.downlink === "number" &&
    connection.downlink > 0 &&
    connection.downlink < 0.5
  ) {
    return "unstable";
  }

  return "good";
}

async function pingHealth(): Promise<{ ok: boolean; slow: boolean }> {
  const started = performance.now();
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

  try {
    const response = await fetch("/api/health", {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });
    const elapsed = performance.now() - started;
    return {
      ok: response.ok,
      slow: elapsed >= SLOW_RESPONSE_MS,
    };
  } catch {
    return { ok: false, slow: false };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function useNetworkStatus() {
  const [quality, setQuality] = useState<NetworkQuality>("good");
  const failuresRef = useRef(0);
  const checkingRef = useRef(false);

  const evaluate = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;

    try {
      if (!navigator.onLine) {
        failuresRef.current = FAILURE_THRESHOLD;
        setQuality("offline");
        return;
      }

      const hint = readConnectionHint();
      const { ok, slow } = await pingHealth();

      if (!ok) {
        failuresRef.current += 1;
        if (failuresRef.current >= FAILURE_THRESHOLD) {
          setQuality(navigator.onLine ? "unstable" : "offline");
        }
        return;
      }

      failuresRef.current = 0;

      if (hint === "unstable" || slow) {
        setQuality("unstable");
        return;
      }

      setQuality("good");
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void evaluate();

    const onOnline = () => {
      failuresRef.current = 0;
      void evaluate();
    };

    const onOffline = () => {
      failuresRef.current = FAILURE_THRESHOLD;
      setQuality("offline");
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const connection = getNavigatorConnection();
    const onConnectionChange = () => {
      void evaluate();
    };

    connection?.addEventListener?.("change", onConnectionChange);

    const intervalId = window.setInterval(() => {
      void evaluate();
    }, PING_INTERVAL_MS);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      connection?.removeEventListener?.("change", onConnectionChange);
      window.clearInterval(intervalId);
    };
  }, [evaluate]);

  return quality;
}
