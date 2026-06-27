"use client";

import { Download, Smartphone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const DISMISS_KEY = "natus-pwa-install-dismissed";
const SHOW_EVENT = "natus-pwa-install-show";

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

export function showPwaInstallToast() {
  window.dispatchEvent(new CustomEvent(SHOW_EVENT));
}

export function InstallPrompt() {
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [, setPromptReady] = useState(false);

  useEffect(() => {
    if (isStandalonePwa()) return;

    const handler = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      deferredRef.current = promptEvent;
      setPromptReady(true);
      setIosHint(false);
      if (!localStorage.getItem(DISMISS_KEY)) {
        setVisible(true);
      }
    };

    const openFromButton = () => {
      if (isStandalonePwa()) {
        setIosHint(false);
        setVisible(true);
        return;
      }
      setIosHint(!deferredRef.current && isIosSafari());
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener(SHOW_EVENT, openFromButton);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener(SHOW_EVENT, openFromButton);
    };
  }, []);

  if (!visible) return null;

  const installed = isStandalonePwa();

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
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Installer l'application Natus"
      aria-live="polite"
      className="pointer-events-auto fixed left-1/2 top-4 z-[110] w-[min(100vw-2rem,24rem)] -translate-x-1/2 animate-fade-in overflow-hidden rounded-xl border border-black/15 bg-[#FAEAA1] shadow-lg"
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/10 text-black">
          {installed ? (
            <Smartphone className="h-5 w-5" aria-hidden />
          ) : (
            <Download className="h-5 w-5" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-black">
            {installed ? "Application installée" : "Télécharger l'application"}
          </p>
          {installed ? (
            <p className="mt-0.5 text-sm text-black/80">
              Natus POS est déjà sur votre écran d&apos;accueil.
            </p>
          ) : iosHint || !deferredRef.current ? (
            <p className="mt-0.5 text-sm leading-snug text-black/85">
              Sur iPhone : touche <strong>Partager</strong>, puis{" "}
              <strong>Sur l&apos;écran d&apos;accueil</strong>.
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-black/85">
              Accédez à la caisse depuis votre écran d&apos;accueil, sur ordinateur ou mobile.
            </p>
          )}
          {!installed && deferredRef.current && (
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
          onClick={() => setVisible(false)}
          className="shrink-0 rounded-md p-1 text-black/60 transition hover:bg-black/5 hover:text-black"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
