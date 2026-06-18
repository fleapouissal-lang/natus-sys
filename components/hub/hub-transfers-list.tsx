"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { repairHubStockTransfer } from "@/lib/actions";
import { formatDate } from "@/lib/utils";
import type { HubStockTransfer } from "@/lib/types";

function statusLabel(status: HubStockTransfer["status"]): string {
  return status === "sent" ? "Envoyé" : "Reçu";
}

function statusVariant(
  status: HubStockTransfer["status"]
): "warning" | "success" {
  return status === "sent" ? "warning" : "success";
}

export function HubTransfersList({
  transfers,
  title = "Transferts récents",
  allowRepair = false,
}: {
  transfers: HubStockTransfer[];
  title?: string;
  allowRepair?: boolean;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function handleRepair(transferId: string) {
    setMessage("");
    setLoadingId(transferId);
    const result = await repairHubStockTransfer(transferId);
    setLoadingId(null);

    if ("error" in result) {
      setMessage(result.error);
      return;
    }

    setMessage(
      result.credited > 0
        ? `Stock réparé pour ${result.credited} produit(s)`
        : "Le stock était déjà à jour"
    );
    router.refresh();
  }

  if (transfers.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted">Aucun transfert pour le moment</p>
      </Card>
    );
  }

  return (
    <Card padding={false}>
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {message && <p className="mt-2 text-sm text-muted">{message}</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-primary-light/30">
              <th className="px-6 py-3 text-left font-medium text-muted">Date</th>
              <th className="px-6 py-3 text-left font-medium text-muted">Destination</th>
              <th className="px-6 py-3 text-left font-medium text-muted">Produits</th>
              <th className="px-6 py-3 text-left font-medium text-muted">Statut</th>
              <th className="px-6 py-3 text-right font-medium text-muted">Unités</th>
              {allowRepair && (
                <th className="px-6 py-3 text-right font-medium text-muted">Action</th>
              )}
            </tr>
          </thead>
          <tbody>
            {transfers.map((transfer) => (
              <tr key={transfer.id} className="border-b border-border last:border-b-0">
                <td className="px-6 py-4 whitespace-nowrap">
                  {formatDate(transfer.sent_at)}
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium">{transfer.to_store_name || "—"}</p>
                  {transfer.receiver_name && transfer.status === "received" && (
                    <p className="text-xs text-muted">Reçu par {transfer.receiver_name}</p>
                  )}
                </td>
                <td className="px-6 py-4">
                  <ul className="space-y-1">
                    {transfer.items.slice(0, 3).map((item) => (
                      <li key={item.id} className="text-xs text-muted">
                        {item.product_name} × {item.quantity}
                      </li>
                    ))}
                    {transfer.items.length > 3 && (
                      <li className="text-xs text-muted">
                        +{transfer.items.length - 3} autre(s)
                      </li>
                    )}
                  </ul>
                </td>
                <td className="px-6 py-4">
                  <Badge variant={statusVariant(transfer.status)}>
                    {statusLabel(transfer.status)}
                  </Badge>
                  {transfer.status === "received" && transfer.received_at && (
                    <p className="mt-1 text-xs text-muted">
                      {formatDate(transfer.received_at)}
                    </p>
                  )}
                </td>
                <td className="px-6 py-4 text-right font-medium">
                  {transfer.total_units}
                </td>
                {allowRepair && (
                  <td className="px-6 py-4 text-right">
                    {transfer.status === "received" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        loading={loadingId === transfer.id}
                        onClick={() => void handleRepair(transfer.id)}
                      >
                        Réparer stock
                      </Button>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
