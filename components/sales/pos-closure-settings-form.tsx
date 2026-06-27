"use client";

import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { updatePosClosureSettings } from "@/lib/sales/store-day-closure-actions";
import type { PosClosureSettings } from "@/lib/sales/pos-closure-settings.server";

export function PosClosureSettingsForm({
  initialSettings,
}: {
  initialSettings: PosClosureSettings;
}) {
  const [requireManagerCode, setRequireManagerCode] = useState(
    initialSettings.requireManagerCode
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSave(nextValue: boolean) {
    setRequireManagerCode(nextValue);
    setError("");
    setSuccess("");

    startTransition(async () => {
      const result = await updatePosClosureSettings(nextValue);
      if ("error" in result) {
        setError(result.error);
        setRequireManagerCode(initialSettings.requireManagerCode);
        return;
      }
      setSuccess(
        nextValue
          ? "Clôture avec code gérant activée pour tous les magasins."
          : "Clôture directe en caisse activée — sans code gérant."
      );
    });
  }

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
          <KeyRound className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-lg font-semibold text-primary">
            Validation clôture caisse
          </h2>
          <p className="mt-1 text-sm text-muted">
            Ce paramètre s&apos;applique à tous les magasins.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => handleSave(true)}
          className={`rounded-xl border p-4 text-left transition-colors cursor-pointer ${
            requireManagerCode
              ? "border-primary bg-primary-light/50"
              : "border-border hover:border-primary/40"
          }`}
        >
          <p className="font-semibold text-foreground">Avec code gérant</p>
          <p className="mt-1 text-sm text-muted">
            Le caissier demande la clôture, saisit le code reçu du gérant, puis le gérant valide.
          </p>
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => handleSave(false)}
          className={`rounded-xl border p-4 text-left transition-colors cursor-pointer ${
            !requireManagerCode
              ? "border-primary bg-primary-light/50"
              : "border-border hover:border-primary/40"
          }`}
        >
          <p className="font-semibold text-foreground">Sans code — clôture directe</p>
          <p className="mt-1 text-sm text-muted">
            En caisse, le bouton « Valider la clôture » clôture immédiatement le jour métier.
          </p>
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}
      {success && (
        <p className="mt-4 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{success}</p>
      )}

      <p className="mt-4 text-xs text-muted">
        Mode actuel :{" "}
        <strong>{requireManagerCode ? "avec code gérant" : "clôture directe en caisse"}</strong>
      </p>
    </Card>
  );
}
