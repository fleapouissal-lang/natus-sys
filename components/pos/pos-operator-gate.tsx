"use client";

import { useState, useTransition } from "react";
import { CreditCard, LogIn, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useBarcodeScanner } from "@/lib/hooks/use-barcode-scanner";
import {
  signInPosOperatorByNfc,
  signInPosOperatorByPassword,
} from "@/lib/pos/actions";
import { isLikelyNfcScan } from "@/lib/pos/nfc";

export function PosOperatorGate({
  storeName,
  terminalEmail,
  gateMode = "initial",
}: {
  storeName?: string;
  terminalEmail?: string;
  gateMode?: "initial" | "switch";
}) {
  const [pending, startTransition] = useTransition();
  const [authMode, setAuthMode] = useState<"password" | "nfc">("password");
  const [error, setError] = useState("");

  const { inputRef, handleKeyDown } = useBarcodeScanner({
    enabled: authMode === "nfc",
    autoRefocus: authMode === "nfc",
    onScan: (code) => {
      if (!isLikelyNfcScan(code)) {
        setError("Scannez votre carte NFC caissier");
        return;
      }
      setError("");
      startTransition(async () => {
        const result = await signInPosOperatorByNfc(code);
        if (result?.error) {
          setError(result.error);
        }
      });
    },
  });

  function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    startTransition(async () => {
      const result = await signInPosOperatorByPassword(email, password);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-page p-6">
      <Card className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <LogIn className="h-7 w-7" />
          </div>
          <h1 className="font-heading text-2xl font-semibold text-primary">
            {gateMode === "switch" ? "Nouveau caissier" : "Connexion caissier"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {gateMode === "switch"
              ? storeName
                ? `Le caissier précédent est déconnecté. Connectez un autre caissier de ${storeName}.`
                : "Le caissier précédent est déconnecté. Connectez un autre caissier du magasin."
              : storeName
                ? `Identifiez-vous pour ouvrir la caisse ${storeName}`
                : "Identifiez-vous pour utiliser la caisse du magasin"}
          </p>
          <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
            Utilisez le <strong>compte personnel du caissier</strong> (ex.{" "}
            <span className="font-mono">oussal.natus.gueliz@natus.ma</span>
            ), pas le compte caisse magasin
            {terminalEmail ? (
              <>
                {" "}
                (<span className="font-mono">{terminalEmail}</span>)
              </>
            ) : null}
            .
          </p>
        </div>

        <div className="mb-5 flex rounded-xl border border-border p-1">
          <button
            type="button"
            onClick={() => setAuthMode("password")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              authMode === "password"
                ? "bg-accent/10 text-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            <LogIn className="h-4 w-4" />
            Email / mot de passe
          </button>
          <button
            type="button"
            onClick={() => setAuthMode("nfc")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              authMode === "nfc"
                ? "bg-accent/10 text-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Carte NFC
          </button>
        </div>

        {authMode === "password" ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              label="Email caissier personnel"
              name="email"
              type="email"
              required
              autoComplete="username"
              placeholder="ex. cashier@natus.ma"
            />
            <PasswordInput
              label="Mot de passe"
              name="password"
              required
              autoComplete="current-password"
            />
            <Button type="submit" className="w-full" loading={pending}>
              Se connecter à la caisse
            </Button>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <div className="rounded-xl border border-dashed border-border bg-surface-2 px-4 py-8">
              <ScanLine className="mx-auto h-10 w-10 text-accent" />
              <p className="mt-3 text-sm text-muted">
                Approchez ou scannez votre badge NFC caissier
              </p>
              <input
                ref={inputRef}
                type="text"
                className="sr-only"
                aria-label="Scan carte NFC"
                onKeyDown={handleKeyDown}
              />
            </div>
            <p className="text-xs text-muted">
              Chaque vente sera enregistrée au nom du caissier connecté
            </p>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </Card>
    </div>
  );
}
