"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, PackageCheck, Truck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { ProductImage } from "@/components/pos/product-image";
import { confirmHubStockTransfer } from "@/lib/actions";
import {
  hubTransferCashierCanValidate,
  hubTransferStatusLabel,
  hubTransferStatusVariant,
  hubTransferStoreStatusHint,
} from "@/lib/hub-transfer-status";
import { TransferAssignedLivreur } from "@/components/stock/transfer-assigned-livreur";
import { formatDate } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { HubStockTransfer, Product } from "@/lib/types";

const ACTION_COLOR = "#B38C4A";

function TransferIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="order-action-icon flex h-8 w-8 shrink-0 items-center justify-center !p-0 border bg-transparent hover:bg-[#B38C4A]/10"
      style={{ borderColor: ACTION_COLOR, color: ACTION_COLOR }}
    >
      {children}
    </Button>
  );
}

export function TransferProductsTable({
  transfer,
  productsById,
  storeStockByProductId,
}: {
  transfer: HubStockTransfer;
  productsById: Record<string, Pick<Product, "id" | "name" | "barcode" | "image_url" | "category">>;
  storeStockByProductId: Record<string, number>;
}) {
  const canValidate = hubTransferCashierCanValidate(transfer.status);
  const transferTotals = transfer.items.reduce(
    (acc, item) => {
      const inStore = storeStockByProductId[item.product_id] ?? 0;
      acc.inStore += inStore;
      acc.received += item.quantity;
      acc.total += inStore;
      return acc;
    },
    { inStore: 0, received: 0, total: 0 }
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-primary-light/30">
            <th className="px-4 py-3 text-left font-medium text-muted">Produit</th>
            <th className="px-4 py-3 text-right font-medium text-muted">En magasin</th>
            <th className="px-4 py-3 text-right font-medium text-muted">
              {canValidate ? "Livré" : "Commandé"}
            </th>
            {canValidate && (
              <th className="px-4 py-3 text-right font-medium text-muted">Stock magasin</th>
            )}
          </tr>
        </thead>
        <tbody>
          {transfer.items.map((item) => {
            const product = productsById[item.product_id];
            const inStore = storeStockByProductId[item.product_id] ?? 0;
            const ordered = item.quantity;

            return (
              <tr key={item.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {product ? <ProductImage product={product} size="sm" /> : null}
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="font-mono text-xs text-muted">{item.product_barcode}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted">{inStore}</td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-primary">
                  {ordered}
                </td>
                {canValidate && (
                  <td className="px-4 py-3 text-right tabular-nums font-bold">{inStore}</td>
                )}
              </tr>
            );
          })}
        </tbody>
        {canValidate && (
          <tfoot>
            <tr className="border-t border-border bg-champagne/30 font-semibold">
              <td className="px-4 py-3 text-left">Total</td>
              <td className="px-4 py-3 text-right tabular-nums text-muted">
                {transferTotals.inStore}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-primary">
                {transferTotals.received}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{transferTotals.total}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export function CashierStockTransfers({
  transfers,
  storeName,
  productsById,
  storeStockByProductId,
  variant = "page",
}: {
  transfers: HubStockTransfer[];
  storeName: string;
  productsById: Record<string, Pick<Product, "id" | "name" | "barcode" | "image_url" | "category">>;
  storeStockByProductId: Record<string, number>;
  /** page = titre principal · section = bloc dans une page combinée */
  variant?: "page" | "section";
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [detailTransfer, setDetailTransfer] = useState<HubStockTransfer | null>(null);

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

    setSuccess("Réception validée — transfert clôturé");
    setDetailTransfer(null);
    router.refresh();
  }

  const detailCanValidate = detailTransfer
    ? hubTransferCashierCanValidate(detailTransfer.status)
    : false;

  return (
    <div className={variant === "page" ? "space-y-6" : "space-y-4"}>
      {variant === "page" && (
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
            Commandes dépôt
          </h1>
          <p className="mt-1 text-sm text-muted">
            Suivi des commandes depuis l&apos;entrepôt hub vers {storeName}
          </p>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      )}
      {success && (
        <p className="rounded-lg bg-success/10 px-4 py-3 text-sm text-success">{success}</p>
      )}

      <Card padding={false}>
        <div className="p-4 md:p-6">
          <CardHeader
            title={variant === "section" ? "Commandes dépôt (hub)" : "Liste des commandes"}
            description={`${totalItems} commande${totalItems !== 1 ? "s" : ""} dépôt`}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border bg-primary-light/50">
                <th className="px-6 py-3 text-left font-medium text-muted">Date</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Source</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Destination</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Statut</th>
                <th className="px-6 py-3 text-right font-medium text-muted">Produits</th>
                <th className="px-6 py-3 text-right font-medium text-muted">Unités</th>
                <th className="px-6 py-3 text-right font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted">
                    Aucune commande dépôt en cours
                  </td>
                </tr>
              ) : (
                paginatedTransfers.map((transfer) => {
                  const canValidate = hubTransferCashierCanValidate(transfer.status);
                  const statusHint = hubTransferStoreStatusHint(transfer.status);

                  return (
                    <tr key={transfer.id} className="border-b border-border last:border-b-0">
                      <td className="px-6 py-4 whitespace-nowrap">{formatDate(transfer.sent_at)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 shrink-0 text-primary" />
                          <div>
                            <span className="font-medium">
                              {transfer.from_store_name || "Entrepôt hub"}
                            </span>
                            <TransferAssignedLivreur name={transfer.assigned_livreur_name} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium">{transfer.to_store_name || storeName}</p>
                        <TransferAssignedLivreur name={transfer.assigned_livreur_name} />
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={hubTransferStatusVariant(transfer.status)}>
                          {hubTransferStatusLabel(transfer.status)}
                        </Badge>
                        {statusHint && <p className="mt-1 text-xs text-muted">{statusHint}</p>}
                        {transfer.notes && (
                          <p className="mt-1 text-xs text-muted line-clamp-2">{transfer.notes}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums">{transfer.items.length}</td>
                      <td className="px-6 py-4 text-right font-medium tabular-nums">
                        {transfer.total_units}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1.5">
                          <TransferIconButton
                            label="Voir le détail"
                            onClick={() => setDetailTransfer(transfer)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </TransferIconButton>
                          {canValidate && (
                            <Button
                              type="button"
                              size="sm"
                              loading={loadingId === transfer.id}
                              onClick={() => void handleConfirm(transfer.id)}
                            >
                              <PackageCheck className="h-4 w-4" />
                              Valider
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalItems > 0 && (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            totalItems={totalItems}
            onPageChange={setPage}
          />
        )}
      </Card>

      {detailTransfer && (
        <Modal onClose={() => setDetailTransfer(null)} size="lg" className="!max-w-[min(96vw,880px)] !p-0">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-heading text-lg font-semibold text-primary-dark">
                    {detailTransfer.from_store_name || "Entrepôt hub"}
                  </h2>
                  <Badge variant={hubTransferStatusVariant(detailTransfer.status)}>
                    {hubTransferStatusLabel(detailTransfer.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {formatDate(detailTransfer.sent_at)}
                  {" · "}
                  {detailTransfer.items.length} produit
                  {detailTransfer.items.length !== 1 ? "s" : ""},{" "}
                  {detailTransfer.total_units} unité
                  {detailTransfer.total_units !== 1 ? "s" : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                  <span>
                    <span className="font-medium text-foreground/80">Source :</span>{" "}
                    {detailTransfer.from_store_name || "Entrepôt hub"}
                  </span>
                  <span>
                    <span className="font-medium text-foreground/80">Destination :</span>{" "}
                    {detailTransfer.to_store_name || storeName}
                  </span>
                </div>
                <TransferAssignedLivreur
                  name={detailTransfer.assigned_livreur_name}
                  className="mt-2"
                />
                {detailTransfer.notes && (
                  <p className="mt-1 text-sm text-muted">{detailTransfer.notes}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDetailTransfer(null)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-primary/10 hover:text-primary-dark"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[min(60vh,520px)] overflow-y-auto p-4 scrollbar-natus">
            <TransferProductsTable
              transfer={detailTransfer}
              productsById={productsById}
              storeStockByProductId={storeStockByProductId}
            />
          </div>

          {detailCanValidate && (
            <div className="flex justify-end border-t border-border px-5 py-4">
              <Button
                type="button"
                loading={loadingId === detailTransfer.id}
                onClick={() => void handleConfirm(detailTransfer.id)}
              >
                <PackageCheck className="h-4 w-4" />
                Valider la réception
              </Button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
