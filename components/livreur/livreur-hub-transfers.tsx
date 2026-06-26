"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { deliverHubTransfer, pickupHubTransfer } from "@/lib/actions";
import {
  hubTransferStatusLabel,
  hubTransferStatusVariant,
} from "@/lib/hub-transfer-status";
import { formatDate } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { HubStockTransfer } from "@/lib/types";

export function LivreurHubTransfers({
  transfers,
}: {
  transfers: HubStockTransfer[];
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const {
    paginated: paginatedTransfers,
    page,
    setPage,
    totalPages,
    rangeStart,
    rangeEnd,
    totalItems,
  } = usePagination(transfers, DEFAULT_PAGE_SIZE);

  async function handlePickup(transferId: string) {
    setError("");
    setSuccess("");
    setLoadingId(transferId);
    const result = await pickupHubTransfer(transferId);
    setLoadingId(null);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    setSuccess("Commande prise en charge — stock dépôt mis à jour");
    router.refresh();
  }

  async function handleDeliver(transferId: string) {
    setError("");
    setSuccess("");
    setLoadingId(transferId);

    const result = await deliverHubTransfer(transferId);
    setLoadingId(null);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    setSuccess("Commande marquée livrée — le caissier doit valider la réception");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Livraisons hub</h1>
        <p className="mt-1 text-muted">
          Prenez la commande au dépôt, livrez au magasin, puis le caissier valide la réception
        </p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {success && <p className="text-sm text-success">{success}</p>}

      {transfers.length === 0 ? (
        <Card className="py-12 text-center text-muted">
          Aucune commande hub assignée
        </Card>
      ) : (
        <div className="space-y-4">
          {paginatedTransfers.map((transfer) => (
            <Card key={transfer.id} padding={false}>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-6 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">
                      Vers {transfer.to_store_name || "magasin"}
                    </h2>
                    <Badge variant={hubTransferStatusVariant(transfer.status)}>
                      {hubTransferStatusLabel(transfer.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {formatDate(transfer.sent_at)}
                    {" · "}
                    {transfer.items.length} produit{transfer.items.length !== 1 ? "s" : ""},{" "}
                    {transfer.total_units} unité{transfer.total_units !== 1 ? "s" : ""}
                  </p>
                  {transfer.status === "livre" && (
                    <p className="mt-2 text-sm text-muted">
                      En attente de validation par le caissier du magasin
                    </p>
                  )}
                </div>

                {transfer.status === "pret" && (
                  <Button
                    type="button"
                    loading={loadingId === transfer.id}
                    onClick={() => void handlePickup(transfer.id)}
                  >
                    Prendre la commande
                  </Button>
                )}

                {transfer.status === "en_livraison" && (
                  <Button
                    type="button"
                    loading={loadingId === transfer.id}
                    onClick={() => void handleDeliver(transfer.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Marquer livré
                  </Button>
                )}

                {transfer.status === "livre" && (
                  <p className="text-sm font-medium text-primary">
                    Livré — validation caissier requise
                  </p>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-primary-light/30">
                      <th className="px-6 py-3 text-left font-medium text-muted">Produit</th>
                      <th className="px-6 py-3 text-right font-medium text-muted">Quantité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfer.items.map((item) => (
                      <tr key={item.id} className="border-b border-border last:border-b-0">
                        <td className="px-6 py-4">
                          <p className="font-medium">{item.product_name}</p>
                          <p className="font-mono text-xs text-muted">{item.product_barcode}</p>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}

      {transfers.length > 0 && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          totalItems={totalItems}
          onPageChange={setPage}
          className="rounded-lg border border-border bg-surface px-6 py-4"
        />
      )}
    </div>
  );
}
