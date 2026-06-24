"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

const DISMISS_KEY = "natus-pwa-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setHidden(false);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (hidden || !deferred) return null;

  const install = async () => {
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      setDeferred(null);
      setHidden(true);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDeferred(null);
    setHidden(true);
  };

  return (
    <div
      role="dialog"
      aria-label="Installer l'application Natus"
      className="fixed bottom-4 left-4 right-4 z-[100] mx-auto flex max-w-md items-start gap-3 rounded-xl border border-primary/25 bg-surface p-4 shadow-lg"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Download className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">
          Installer Natus
        </p>
        <p className="mt-0.5 text-xs text-muted">
          Accédez à la caisse depuis votre écran d&apos;accueil, sur ordinateur
          ou mobile.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={install}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90"
          >
            Installer
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg px-3 py-1.5 text-xs text-muted transition hover:bg-page"
          >
            Plus tard
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-md p-1 text-muted transition hover:bg-page hover:text-foreground"
        aria-label="Fermer"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
