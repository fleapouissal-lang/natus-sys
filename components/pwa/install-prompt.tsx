"use client";

import { Download, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const DISMISS_UNTIL_KEY = "natus-pwa-install-dismissed-until";
const SHOWN_SESSION_KEY = "natus-pwa-install-shown-session";
const SHOW_EVENT = "natus-pwa-install-show";
const AUTO_SHOW_DELAY_MS = 2400;
const DISMISS_DURATION_MS = 3 * 60 * 60 * 1000; // 3 heures

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream;
}

function getNavigationType(): PerformanceNavigationTiming["type"] | "navigate" {
  const nav = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  return nav?.type ?? "navigate";
}

/** Afficher le toast auto : 1× / 3 h, sauf rechargement (rappel) ; jamais si PWA installée. */
export function shouldAutoShowPwaInstallToast(): boolean {
  if (typeof window === "undefined") return false;
  if (isStandalonePwa()) return false;

  if (getNavigationType() === "reload") return true;

  const dismissedUntil = Number(localStorage.getItem(DISMISS_UNTIL_KEY) || 0);
  if (Date.now() < dismissedUntil) return false;

  if (sessionStorage.getItem(SHOWN_SESSION_KEY)) return false;

  return true;
}

function markPwaInstallToastShown() {
  sessionStorage.setItem(SHOWN_SESSION_KEY, "1");
}

function dismissPwaInstallToastFor3Hours() {
  localStorage.setItem(
    DISMISS_UNTIL_KEY,
    String(Date.now() + DISMISS_DURATION_MS)
  );
  markPwaInstallToastShown();
}

export function showPwaInstallToast() {
  if (isStandalonePwa()) return;
  window.dispatchEvent(new CustomEvent(SHOW_EVENT));
}

export function InstallPrompt() {
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [, setPromptReady] = useState(false);

  const openToast = useCallback((options?: { force?: boolean }) => {
    if (isStandalonePwa()) return;
    if (!options?.force && !shouldAutoShowPwaInstallToast()) return;

    setIosHint(!deferredRef.current && isIosSafari());
    setVisible(true);
    markPwaInstallToastShown();
  }, []);

  useEffect(() => {
    if (isStandalonePwa()) return;

    const handler = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      deferredRef.current = promptEvent;
      setPromptReady(true);
      setIosHint(false);
      if (shouldAutoShowPwaInstallToast()) {
        setVisible(true);
        markPwaInstallToastShown();
      }
    };

    const openFromEvent = () => {
      openToast({ force: true });
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener(SHOW_EVENT, openFromEvent);

    let autoTimer: ReturnType<typeof setTimeout> | undefined;
    if (shouldAutoShowPwaInstallToast()) {
      autoTimer = window.setTimeout(() => {
        openToast();
      }, AUTO_SHOW_DELAY_MS);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener(SHOW_EVENT, openFromEvent);
      if (autoTimer) window.clearTimeout(autoTimer);
    };
  }, [openToast]);

  if (!visible || isStandalonePwa()) return null;

  const install = async () => {
    const promptEvent = deferredRef.current;
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") {
      deferredRef.current = null;
      setPromptReady(false);
      setVisible(false);
    }
  };

  const dismiss = () => {
    dismissPwaInstallToastFor3Hours();
    setVisible(false);
  };

  const close = () => {
    markPwaInstallToastShown();
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Installer l'application Natus"
      aria-live="polite"
      className="natus-pwa-install-toast pointer-events-auto fixed left-1/2 z-[110] w-[min(100vw-2rem,24rem)] -translate-x-1/2 animate-fade-in overflow-hidden rounded-xl border border-black/15 bg-[#FAEAA1] shadow-lg max-lg:bottom-[max(1rem,env(safe-area-inset-bottom))] max-lg:top-auto lg:top-4"
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/10 text-black">
          <Download className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-black">Télécharger l&apos;application</p>
          {iosHint || !deferredRef.current ? (
            <p className="mt-0.5 text-sm leading-snug text-black/85">
              Sur iPhone : touche <strong>Partager</strong>, puis{" "}
              <strong>Sur l&apos;écran d&apos;accueil</strong>.
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-black/85">
              Accédez à la caisse depuis votre écran d&apos;accueil, sur ordinateur ou mobile.
            </p>
          )}
          {deferredRef.current && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={install}
                className="rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-[#FAEAA1] transition hover:opacity-90"
              >
                Installer
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-black/75 transition hover:bg-black/5"
              >
                Plus tard
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={close}
          className="shrink-0 rounded-md p-1 text-black/60 transition hover:bg-black/5 hover:text-black"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
