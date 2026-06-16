"use client";

import { useState, useTransition } from "react";
import { Settings2 } from "lucide-react";
import { updateLoyaltySettings } from "@/lib/actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  formatLoyaltyEarnRule,
  formatLoyaltyRedeemRule,
} from "@/lib/loyalty/settings";
import type { LoyaltySettings } from "@/lib/types";

export function LoyaltySettingsForm({
  initialSettings,
}: {
  initialSettings: LoyaltySettings;
}) {
  const [pointsPerMad, setPointsPerMad] = useState(String(initialSettings.pointsPerMad));
  const [pointValueMad, setPointValueMad] = useState(String(initialSettings.pointValueMad));
  const [minPointsToRedeem, setMinPointsToRedeem] = useState(
    String(initialSettings.minPointsToRedeem)
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, startTransition] = useTransition();

  const preview: LoyaltySettings = {
    pointsPerMad: Number(pointsPerMad) || initialSettings.pointsPerMad,
    pointValueMad: Number(pointValueMad) || initialSettings.pointValueMad,
    minPointsToRedeem: Number(minPointsToRedeem) || initialSettings.minPointsToRedeem,
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    startTransition(async () => {
      const result = await updateLoyaltySettings({
        pointsPerMad: Number(pointsPerMad),
        pointValueMad: Number(pointValueMad),
        minPointsToRedeem: Number(minPointsToRedeem),
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      setPointsPerMad(String(result.settings.pointsPerMad));
      setPointValueMad(String(result.settings.pointValueMad));
      setMinPointsToRedeem(String(result.settings.minPointsToRedeem));
      setSuccess("Paramètres fidélité enregistrés.");
    });
  }

  return (
    <Card>
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
          <Settings2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold text-primary">
            Règles de calcul des points
          </h2>
          <p className="mt-1 text-sm text-muted">
            Définissez comment les clients gagnent et utilisent leurs points en caisse.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="MAD d'achat pour 1 point"
            type="number"
            min="0.01"
            step="0.01"
            value={pointsPerMad}
            onChange={(e) => setPointsPerMad(e.target.value)}
            required
          />
          <Input
            label="Valeur d'1 point (MAD)"
            type="number"
            min="0.01"
            step="0.01"
            value={pointValueMad}
            onChange={(e) => setPointValueMad(e.target.value)}
            required
          />
          <Input
            label="Minimum pour payer en caisse (pts)"
            type="number"
            min="0"
            step="1"
            value={minPointsToRedeem}
            onChange={(e) => setMinPointsToRedeem(e.target.value)}
            required
          />
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary-light/10 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">Aperçu des règles</p>
          <ul className="mt-2 space-y-1 text-muted">
            <li>Gain : {formatLoyaltyEarnRule(preview)}</li>
            <li>Utilisation : {formatLoyaltyRedeemRule(preview)}</li>
            <li>Paiement avec points dès {preview.minPointsToRedeem} pts</li>
          </ul>
          <p className="mt-2 text-xs text-muted">
            Exemple : achat de {preview.pointsPerMad * 5} MAD → 5 points gagnés · 10 points
            utilisés = {10 * preview.pointValueMad} MAD de réduction
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}
        {success && (
          <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{success}</p>
        )}

        <Button type="submit" loading={pending}>
          Enregistrer les règles
        </Button>
      </form>
    </Card>
  );
}
