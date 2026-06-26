"use client";

import { useEffect } from "react";

function markStandalonePwa() {
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  document.documentElement.classList.toggle("natus-pwa-standalone", isStandalone);
}

export function PwaRegister() {
  useEffect(() => {
    markStandalonePwa();

    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Ignore registration errors (e.g. unsupported context).
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
