"use client";

import { useEffect, useState } from "react";
import { Check, Download, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

export function LoyaltyCardInstall({ token }: { token: string }) {
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setInstalled(isStandaloneDisplay());
    setIsMobile(isMobileDevice());

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw-carte.js", { scope: "/carte/" });
    }

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onInstallPrompt);
  }, [token]);

  async function handleNativeInstall() {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
      setDeferredPrompt(null);
    } finally {
      setInstalling(false);
    }
  }

  if (installed) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
        <Check className="h-5 w-5 shrink-0" />
        <p>
          <span className="font-semibold">Application installée</span>
          <span className="block text-xs opacity-90">
            Retrouvez votre carte sur l&apos;écran d&apos;accueil de votre téléphone.
          </span>
        </p>
      </div>
    );
  }

  const showNativeButton = Boolean(deferredPrompt);
  const showManualHelp = isIosDevice() || (!deferredPrompt && isMobile);

  return (
    <div className="space-y-3">
      {(showNativeButton || showManualHelp) && (
        <div className="rounded-2xl border border-primary/25 bg-primary-light/15 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                Ajouter comme application
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Installez votre carte sur l&apos;écran d&apos;accueil pour y accéder en un geste,
                comme une application.
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {showNativeButton && (
              <Button
                type="button"
                className="w-full gap-2"
                disabled={installing}
                onClick={() => void handleNativeInstall()}
              >
                <Download className="h-4 w-4" />
                {installing ? "Installation…" : "Installer l'application"}
              </Button>
            )}

            {showManualHelp && (
              <button
                type="button"
                onClick={() => setShowHelp((value) => !value)}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                  showNativeButton
                    ? "border-border bg-surface text-foreground hover:bg-page"
                    : "border-primary/30 bg-primary text-white hover:opacity-90"
                )}
              >
                {isIosDevice() ? (
                  <Share className="h-4 w-4" />
                ) : (
                  <Smartphone className="h-4 w-4" />
                )}
                {isIosDevice()
                  ? "Ajouter à l'écran d'accueil (iPhone)"
                  : "Comment installer sur mon téléphone"}
              </button>
            )}
          </div>
        </div>
      )}

      {showHelp && (
        <div className="rounded-2xl border border-border bg-surface p-5 text-sm">
          {isIosDevice() ? (
            <>
              <p className="font-semibold text-foreground">iPhone / iPad (Safari)</p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-muted">
                <li>Ouvrez ce lien dans <strong>Safari</strong></li>
                <li>Appuyez sur <strong>Partager</strong> (icône carré avec flèche)</li>
                <li>Choisissez <strong>Sur l&apos;écran d&apos;accueil</strong></li>
                <li>Confirmez avec <strong>Ajouter</strong></li>
              </ol>
            </>
          ) : (
            <>
              <p className="font-semibold text-foreground">Android (Chrome)</p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-muted">
                <li>Ouvrez ce lien dans <strong>Chrome</strong></li>
                <li>Menu <strong>⋮</strong> en haut à droite</li>
                <li>
                  <strong>Installer l&apos;application</strong> ou{" "}
                  <strong>Ajouter à l&apos;écran d&apos;accueil</strong>
                </li>
              </ol>
              <p className="mt-4 font-semibold text-foreground">iPhone (Safari)</p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-muted">
                <li>Partager → Sur l&apos;écran d&apos;accueil → Ajouter</li>
              </ol>
            </>
          )}
          <p className="mt-4 text-xs text-muted">
            Votre carte s&apos;ouvrira en plein écran. Actualisez vos points avec le bouton
            « Actualiser mes points ».
          </p>
        </div>
      )}
    </div>
  );
}
