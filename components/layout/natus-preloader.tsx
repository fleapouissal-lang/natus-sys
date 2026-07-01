"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const MIN_VISIBLE_MS = 750;
const MAX_VISIBLE_MS = 5000;

/** Une seule animation par session (pas à chaque navigation). */
let preloaderPlayed = false;

export function NatusPreloader() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<"loading" | "exit" | "hidden">("hidden");

  useEffect(() => {
    if (pathname === "/login") return;
    if (preloaderPlayed) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      preloaderPlayed = true;
      return;
    }

    preloaderPlayed = true;
    setPhase("loading");
    document.documentElement.classList.add("natus-is-loading");
    const startedAt = Date.now();
    let finished = false;

    function dismiss() {
      if (finished) return;
      finished = true;

      const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt));
      window.setTimeout(() => {
        setPhase("exit");
        window.setTimeout(() => {
          setPhase("hidden");
          document.documentElement.classList.remove("natus-is-loading");
        }, 520);
      }, remaining);
    }

    if (document.readyState === "complete") {
      dismiss();
    } else {
      window.addEventListener("load", dismiss, { once: true });
    }

    const safetyTimer = window.setTimeout(dismiss, MAX_VISIBLE_MS);

    return () => {
      window.removeEventListener("load", dismiss);
      window.clearTimeout(safetyTimer);
      document.documentElement.classList.remove("natus-is-loading");
    };
  }, [pathname]);

  if (pathname === "/login" || phase === "hidden") return null;

  return (
    <div
      className={cn(
        "natus-preloader",
        phase === "exit" && "natus-preloader--exit"
      )}
      role="status"
      aria-live="polite"
      aria-label="Chargement de Natus"
    >
      <div className="natus-preloader__backdrop" />
      <div className="natus-preloader__content">
        <p className="natus-preloader__logo">Natus</p>
        <div className="natus-preloader__spinner" aria-hidden>
          <span className="natus-preloader__ring" />
          <span className="natus-preloader__core" />
        </div>
        <div className="natus-preloader__progress" aria-hidden>
          <span className="natus-preloader__progress-bar" />
        </div>
        <p className="natus-preloader__tagline">Cosmétiques</p>
      </div>
    </div>
  );
}
