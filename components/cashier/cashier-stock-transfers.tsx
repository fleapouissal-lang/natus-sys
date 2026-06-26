"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { ProductImage } from "@/components/pos/product-image";
import { confirmHubStockTransfer } from "@/lib/actions";
import {
  hubTransferCashierCanValidate,
  hubTransferStatusLabel,
  hubTransferStatusVariant,
  hubTransferStoreStatusHint,
} from "@/lib/hub-transfer-status";
import { formatDate } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { HubStockTransfer, Product } from "@/lib/types";

export function CashierStockTransfers({
  transfers,
  storeName,
  productsById,
  storeStockByProductId,
}: {
  transfers: HubStockTransfer[];
  storeName: string;
  productsById: Record<string, Pick<Product, "id" | "name" | "barcode" | "image_url" | "category">>;
  storeStockByProductId: Record<string, number>;
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

  async function handleConfirm(transferId: string) {
    setError("");
    setSuccess("");
    setLoadingId(transferId);

    const result = await confirmHubStockTransfer(transferId);
    setLoadingId(null);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    setSuccess("Réception validée — le stock magasin a été mis à jour");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Commandes dépôt</h1>
        <p className="mt-1 text-muted">
          Suivi des commandes depuis l&apos;entrepôt hub vers {storeName}
        </p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {success && <p className="text-sm text-success">{success}</p>}

      {transfers.length === 0 ? (
        <Card className="py-12 text-center text-muted">
          Aucune commande dépôt en cours
        </Card>
      ) : (
        <div className="space-y-4">
          {paginatedTransfers.map((transfer) => {
            const canValidate = hubTransferCashierCanValidate(transfer.status);
            const statusHint = hubTransferStoreStatusHint(transfer.status);
            const transferTotals = transfer.items.reduce(
              (acc, item) => {
                const inStore = storeStockByProductId[item.product_id] ?? 0;
                acc.inStore += inStore;
                acc.received += item.quantity;
                acc.total += inStore + (canValidate ? item.quantity : 0);
                return acc;
              },
              { inStore: 0, received: 0, total: 0 }
            );

            return (
              <Card key={transfer.id} padding={false}>
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-6 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-semibold">
                        {transfer.from_store_name || "Entrepôt hub"}
                      </h2>
                      <Badge variant={hubTransferStatusVariant(transfer.status)}>
                        {hubTransferStatusLabel(transfer.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {formatDate(transfer.sent_at)}
                      {transfer.creator_name ? ` · ${transfer.creator_name}` : ""}
                      {" · "}
                      {transfer.items.length} produit{transfer.items.length !== 1 ? "s" : ""},{" "}
                      {transfer.total_units} unité{transfer.total_units !== 1 ? "s" : ""}
                    </p>
                    {statusHint && (
                      <p className="mt-2 text-sm text-foreground/90">{statusHint}</p>
                    )}
                    {transfer.assigned_livreur_name && (
                      <p className="mt-1 text-xs text-muted">
                        Livreur : {transfer.assigned_livreur_name}
                      </p>
                    )}
                    {transfer.notes && (
                      <p className="mt-1 text-sm text-muted">{transfer.notes}</p>
                    )}
                  </div>
                  {canValidate ? (
                    <Button
                      type="button"
                      loading={loadingId === transfer.id}
                      onClick={() => void handleConfirm(transfer.id)}
                    >
                      <PackageCheck className="h-4 w-4" />
                      Valider la réception
                    </Button>
                  ) : (
                    <p className="max-w-xs text-right text-xs text-muted">
                      {transfer.status === "en_cours"
                        ? "Commande enregistrée au dépôt"
                        : "En attente — le caissier validera après livraison du livreur"}
                    </p>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-primary-light/30">
                        <th className="px-6 py-3 text-left font-medium text-muted">Produit</th>
                        <th className="px-6 py-3 text-right font-medium text-muted">
                          En magasin
                        </th>
                        <th className="px-6 py-3 text-right font-medium text-muted">
                          {canValidate ? "À recevoir" : "Commandé"}
                        </th>
                        {canValidate && (
                          <th className="px-6 py-3 text-right font-medium text-muted">
                            Total magasin
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {transfer.items.map((item) => {
                        const product = productsById[item.product_id];
                        const inStore = storeStockByProductId[item.product_id] ?? 0;
                        const ordered = item.quantity;
                        const totalInStore = inStore + ordered;
                        return (
                          <tr key={item.id} className="border-b border-border last:border-b-0">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {product ? (
                                  <ProductImage product={product} size="sm" />
                                ) : null}
                                <div>
                                  <p className="font-medium">{item.product_name}</p>
                                  <p className="font-mono text-xs text-muted">
                                    {item.product_barcode}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right tabular-nums text-muted">
                              {inStore}
                            </td>
                            <td className="px-6 py-4 text-right tabular-nums font-semibold text-primary">
                              {canValidate ? "+" : ""}
                              {ordered}
                            </td>
                            {canValidate && (
                              <td className="px-6 py-4 text-right tabular-nums font-bold">
                                {totalInStore}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                    {canValidate && (
                      <tfoot>
                        <tr className="border-t border-border bg-champagne/30 font-semibold">
                          <td className="px-6 py-3 text-left">Total</td>
                          <td className="px-6 py-3 text-right tabular-nums text-muted">
                            {transferTotals.inStore}
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums text-primary">
                            +{transferTotals.received}
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums">
                            {transferTotals.total}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </Card>
            );
          })}
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
