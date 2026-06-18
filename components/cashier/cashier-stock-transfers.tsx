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
import { formatDate } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { HubStockTransfer, Product } from "@/lib/types";

export function CashierStockTransfers({
  transfers,
  storeName,
  productsById,
}: {
  transfers: HubStockTransfer[];
  storeName: string;
  productsById: Record<string, Pick<Product, "id" | "name" | "barcode" | "image_url" | "category">>;
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

    setSuccess("Réception confirmée — le stock a été mis à jour");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Réceptions hub</h1>
        <p className="mt-1 text-muted">
          Stock envoyé par l&apos;entrepôt hub vers {storeName}
        </p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {success && <p className="text-sm text-success">{success}</p>}

      {transfers.length === 0 ? (
        <Card className="py-12 text-center text-muted">
          Aucun envoi en attente de réception
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
                      Envoi depuis {transfer.from_store_name || "entrepôt hub"}
                    </h2>
                    <Badge variant="warning">Envoyé</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {formatDate(transfer.sent_at)}
                    {transfer.creator_name ? ` · ${transfer.creator_name}` : ""}
                  </p>
                  {transfer.notes && (
                    <p className="mt-1 text-sm text-muted">{transfer.notes}</p>
                  )}
                </div>
                <Button
                  type="button"
                  loading={loadingId === transfer.id}
                  onClick={() => void handleConfirm(transfer.id)}
                >
                  <PackageCheck className="h-4 w-4" />
                  Marquer comme reçu
                </Button>
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
                    {transfer.items.map((item) => {
                      const product = productsById[item.product_id];
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
                          <td className="px-6 py-4 text-right font-medium">
                            +{item.quantity}
                          </td>
                        </tr>
                      );
                    })}
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
