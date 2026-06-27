"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, History, KeyRound, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reviewStockModifyAccessRequest } from "@/lib/stock-modify-access/actions";
import {
  STOCK_MODIFY_ACCESS_STATUS_LABELS,
  type StockModifyAccessMovement,
  type StockModifyAccessRequest,
} from "@/lib/stock-modify-access/types";
import { formatAccessPeriod } from "@/lib/stock-modify-access/utils";
import { formatDate } from "@/lib/utils";

function statusVariant(status: StockModifyAccessRequest["status"]) {
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "danger" as const;
  return "warning" as const;
}

function movementTypeLabel(type: string): string {
  if (type === "add") return "Ajout";
  if (type === "adjustment") return "Ajustement";
  return type;
}

export function StockModifyAccessDirectorPanel({
  pendingRequests,
  recentRequests,
  movements,
}: {
  pendingRequests: StockModifyAccessRequest[];
  recentRequests: StockModifyAccessRequest[];
  movements: StockModifyAccessMovement[];
}) {
  const router = useRouter();
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleReview(requestId: string, approve: boolean) {
    setError("");
    startTransition(async () => {
      const result = await reviewStockModifyAccessRequest({
        requestId,
        approve,
        reviewNote: reviewNotes[requestId] || "",
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card padding={false}>
        <div className="border-b border-border px-6 py-4">
          <CardHeader
            title="Demandes d'accès modification stock"
            description="Validez ou refusez les demandes des gérants et dépôts"
          />
        </div>
        <div className="p-6">
          {error && (
            <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}

          {pendingRequests.length === 0 ? (
            <p className="text-center text-muted">Aucune demande en attente</p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-primary" />
                        <p className="font-semibold">
                          {request.requester?.full_name || request.requester?.email || "Demandeur"}
                        </p>
                        <Badge variant="warning">
                          {request.requester_role === "hub" ? "Dépôt" : "Gérant"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        Période : {formatAccessPeriod(request.valid_from, request.valid_to)}
                      </p>
                      <p className="text-sm text-muted">
                        Demandé le {formatDate(request.created_at)}
                      </p>
                      {request.request_note && (
                        <p className="mt-2 text-sm">{request.request_note}</p>
                      )}
                      {request.requester_role === "hub" && request.hub_store && (
                        <p className="mt-2 text-sm">
                          Entrepôt : {request.hub_store.name} — {request.hub_store.city}
                        </p>
                      )}
                      {request.stores && request.stores.length > 0 && (
                        <ul className="mt-2 list-inside list-disc text-sm">
                          {request.stores.map((store) => (
                            <li key={store.id}>
                              {store.name} — {store.city}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <Input
                    label="Note de décision (optionnel)"
                    value={reviewNotes[request.id] || ""}
                    onChange={(e) =>
                      setReviewNotes((current) => ({ ...current, [request.id]: e.target.value }))
                    }
                    className="mt-4"
                  />

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="gap-2"
                      disabled={pending}
                      onClick={() => handleReview(request.id, true)}
                    >
                      <Check className="h-4 w-4" />
                      Approuver
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="gap-2 text-danger"
                      disabled={pending}
                      onClick={() => handleReview(request.id, false)}
                    >
                      <X className="h-4 w-4" />
                      Refuser
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card padding={false}>
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Historique des demandes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Demandeur</th>
                <th className="px-6 py-3 font-medium">Rôle</th>
                <th className="px-6 py-3 font-medium">Période</th>
                <th className="px-6 py-3 font-medium">Périmètre</th>
                <th className="px-6 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {recentRequests.map((request) => (
                <tr key={request.id} className="border-b border-border/60">
                  <td className="px-6 py-3">{formatDate(request.created_at)}</td>
                  <td className="px-6 py-3">
                    {request.requester?.full_name || request.requester?.email || "—"}
                  </td>
                  <td className="px-6 py-3">
                    {request.requester_role === "hub" ? "Dépôt" : "Gérant"}
                  </td>
                  <td className="px-6 py-3">
                    {formatAccessPeriod(request.valid_from, request.valid_to)}
                  </td>
                  <td className="px-6 py-3">
                    {request.hub_store
                      ? request.hub_store.name
                      : request.stores?.map((s) => s.name).join(", ") || "—"}
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant={statusVariant(request.status)}>
                      {STOCK_MODIFY_ACCESS_STATUS_LABELS[request.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card padding={false}>
        <div className="border-b border-border px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <History className="h-5 w-5 text-primary" />
            Modifications stock sous accès délégué
          </h2>
        </div>
        {movements.length === 0 ? (
          <p className="px-6 py-8 text-center text-muted">Aucune modification enregistrée</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Acteur</th>
                  <th className="px-6 py-3 font-medium">Rôle</th>
                  <th className="px-6 py-3 font-medium">Magasin</th>
                  <th className="px-6 py-3 font-medium">Produit</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Qté</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id} className="border-b border-border/60">
                    <td className="px-6 py-3">{formatDate(movement.created_at)}</td>
                    <td className="px-6 py-3">
                      {movement.actor?.full_name || movement.actor?.email || "—"}
                    </td>
                    <td className="px-6 py-3">{movement.actor?.role || "—"}</td>
                    <td className="px-6 py-3">
                      {movement.store?.name || "—"}
                      {movement.store?.city ? ` — ${movement.store.city}` : ""}
                    </td>
                    <td className="px-6 py-3">{movement.product?.name || "—"}</td>
                    <td className="px-6 py-3">{movementTypeLabel(movement.type)}</td>
                    <td className="px-6 py-3 font-medium">{movement.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
