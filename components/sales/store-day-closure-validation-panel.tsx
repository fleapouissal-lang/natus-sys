"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { KeyRound, Loader2, RefreshCw, ScrollText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  listPendingStoreDayClosures,
  validateStoreDayClosure,
} from "@/lib/sales/store-day-closure-actions";
import { formatDayClosureDate, formatClosureCodeExpiresAt } from "@/lib/sales/day-closure";
import type { PendingStoreDayClosureRow } from "@/lib/sales/store-day-closure";
import { formatCurrency, formatDate } from "@/lib/utils";

export function StoreDayClosureValidationPanel({
  initialClosures,
  roleLabel = "gérant",
}: {
  initialClosures: PendingStoreDayClosureRow[];
  roleLabel?: "gérant" | "directeur";
}) {
  const [closures, setClosures] = useState(initialClosures);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshing, startRefresh] = useTransition();
  const [validating, startValidate] = useTransition();

  const reload = useCallback(() => {
    startRefresh(async () => {
      const result = await listPendingStoreDayClosures();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setClosures(result.closures);
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      reload();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [reload]);

  function handleValidate(targetCode?: string) {
    const value = (targetCode ?? code).trim();
    if (!value) {
      setError("Saisissez le code à 6 chiffres.");
      return;
    }

    startValidate(async () => {
      setError("");
      setSuccess("");
      const result = await validateStoreDayClosure(value);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSuccess(
        `Caisse ${result.storeName} clôturée pour le ${formatDayClosureDate(result.closedBusinessDate)}. Prochain jour métier : ${formatDayClosureDate(result.nextBusinessDate)}.`
      );
      setCode("");
      reload();
    });
  }

  const codeLabel = roleLabel === "directeur" ? "Code de clôture" : "Code gérant";

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Valider une clôture</h2>
            </div>
            <p className="mt-1 text-sm text-muted">
              Saisissez le code communiqué par la caisse. Chaque code est valide 2 h puis renouvelé
              automatiquement.
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={reload} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Actualiser
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1 max-w-sm">
            <label htmlFor="closure-code" className="mb-1 block text-sm font-medium">
              {codeLabel}
            </label>
            <input
              id="closure-code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="natus-field w-full bg-surface font-mono text-lg tracking-[0.35em]"
            />
          </div>
          <Button type="button" onClick={() => handleValidate()} disabled={validating || code.length !== 6}>
            {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScrollText className="h-4 w-4" />}
            Fermer la caisse
          </Button>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}
        {success && (
          <p className="mt-3 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{success}</p>
        )}
      </Card>

      <Card padding={false}>
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Clôtures en attente</h2>
          <p className="mt-1 text-sm text-muted">
            {closures.length} demande{closures.length !== 1 ? "s" : ""} — communiquez le code au caissier pour
            l&apos;impression du rapport
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border bg-primary-light/40 text-left text-muted">
                <th className="px-6 py-3 font-medium">Magasin</th>
                <th className="px-6 py-3 font-medium">Jour métier</th>
                <th className="px-6 py-3 font-medium">Code</th>
                <th className="px-6 py-3 font-medium">Expire</th>
                <th className="px-6 py-3 font-medium">Caissier</th>
                <th className="px-6 py-3 font-medium">Impression</th>
                <th className="px-6 py-3 text-right font-medium">Total</th>
                <th className="px-6 py-3 font-medium">Demandée</th>
                <th className="px-6 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {closures.map((closure) => (
                <tr key={closure.id} className="border-b border-border last:border-b-0">
                  <td className="px-6 py-4">
                    <p className="font-medium">{closure.store_name}</p>
                    <p className="text-xs text-muted">{closure.store_city}</p>
                  </td>
                  <td className="px-6 py-4 capitalize text-muted">
                    {formatDayClosureDate(closure.business_date)}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="accent" className="font-mono text-base tracking-[0.25em]">
                      {closure.validation_code}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-muted">
                    {formatClosureCodeExpiresAt(closure.code_expires_at)}
                  </td>
                  <td className="px-6 py-4">{closure.requested_by_name}</td>
                  <td className="px-6 py-4">
                    {closure.cashier_code_confirmed ? (
                      <Badge variant="success">Code saisi caisse</Badge>
                    ) : (
                      <Badge variant="warning">En attente caissier</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-medium tabular-nums">
                    {formatCurrency(closure.stats.total)}
                  </td>
                  <td className="px-6 py-4 text-muted">{formatDate(closure.requested_at)}</td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleValidate(closure.validation_code)}
                      disabled={validating}
                    >
                      Valider
                    </Button>
                  </td>
                </tr>
              ))}
              {closures.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-muted">
                    Aucune clôture en attente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
