"use client";

import { ArrowRight, Download, Printer, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  buildBonCommandeData,
  downloadBonCommandeHtml,
  printBonCommandeHtml,
} from "@/lib/stock-transfers/download-bon-commande";
import { ProductImage } from "@/components/pos/product-image";
import { TransferProductsTable } from "@/components/cashier/cashier-stock-transfers";
import { TransferAssignedLivreur } from "@/components/stock/transfer-assigned-livreur";
import {
  hubTransferStatusLabel,
  hubTransferStatusVariant,
} from "@/lib/hub-transfer-status";
import {
  storeTransferStatusLabel,
  storeTransferStatusVariant,
} from "@/lib/store-transfer-status";
import type { ReceivedTransferRow } from "@/lib/stock-transfers/received-transfer-rows";
import {
  buildTransferStatusTimeline,
  formatTransferOrderNumber,
} from "@/lib/stock-transfers/source-order-history";
import { formatDate } from "@/lib/utils";
import type { HubStockTransfer, Product } from "@/lib/types";

export type TransferDetailVariant = "order" | "reception";

function TransferItemsTable({
  row,
  showImages,
}: {
  row: ReceivedTransferRow;
  showImages?: boolean;
}) {
  const items = row.transfer.items;

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-primary-light/30">
            <th className="px-4 py-3 text-left font-medium text-muted">Produit</th>
            <th className="px-4 py-3 text-left font-medium text-muted">Code-barres</th>
            <th className="px-4 py-3 text-right font-medium text-muted">Quantité envoyée</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border last:border-b-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {showImages && (
                    <ProductImage
                      product={{
                        name: item.product_name,
                        image_url: item.product_image_url ?? null,
                        category: "",
                      }}
                      size="sm"
                    />
                  )}
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    {"product_code" in item && item.product_code && (
                      <p className="text-xs text-muted">Code {item.product_code}</p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted">
                {item.product_barcode || "—"}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold">
                {item.quantity}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border bg-champagne/20 font-semibold">
            <td className="px-4 py-3" colSpan={2}>
              Total commande
            </td>
            <td className="px-4 py-3 text-right tabular-nums">
              {row.transfer.total_units}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function OrderTimeline({ transfer }: { transfer: ReceivedTransferRow["transfer"] }) {
  const steps = buildTransferStatusTimeline(transfer);

  if (steps.length === 0) return null;

  return (
    <div className="mb-4 space-y-3 rounded-xl border border-border bg-page/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Chronologie des statuts
      </p>
      <ol className="space-y-2">
        {steps.map((step, index) => (
          <li key={`${step.status}-${step.at}`} className="flex gap-3 text-sm">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{step.label}</p>
              <p className="text-xs text-muted">{formatDate(step.at)}</p>
            </div>
            {index === steps.length - 1 ? (
              <Badge variant="accent" className="shrink-0 self-start text-xs">
                Actuel
              </Badge>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ReceivedTransferDetailModal({
  row,
  onClose,
  showProductImages = false,
  detailVariant = "reception",
  cashierHub,
  canValidate,
  validateLoading,
  onValidate,
}: {
  row: ReceivedTransferRow | null;
  onClose: () => void;
  showProductImages?: boolean;
  /** order = compte source (commande envoyée) · reception = magasin destination */
  detailVariant?: TransferDetailVariant;
  cashierHub?: {
    storeName: string;
    productsById: Record<
      string,
      Pick<Product, "id" | "name" | "barcode" | "image_url" | "category">
    >;
    storeStockByProductId: Record<string, number>;
  };
  canValidate?: boolean;
  validateLoading?: boolean;
  onValidate?: () => void;
}) {
  if (!row) return null;

  const transfer = row.transfer;
  const isStore = row.source === "store";
  const isOrderView = detailVariant === "order";
  const statusLabel =
    row.source === "store"
      ? storeTransferStatusLabel(row.transfer.status)
      : hubTransferStatusLabel(row.transfer.status);
  const statusVariant =
    row.source === "store"
      ? storeTransferStatusVariant(row.transfer.status)
      : hubTransferStatusVariant(row.transfer.status);

  const fromName = transfer.from_store_name || "—";
  const toName =
    transfer.to_store_name ||
    (cashierHub && !isStore && !isOrderView ? cashierHub.storeName : "—");

  const useReceptionProducts =
    !isOrderView && !isStore && cashierHub && row.transfer;

  return (
    <Modal
      onClose={onClose}
      size="lg"
      className="!max-w-[min(96vw,920px)] !p-0"
    >
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-primary-light/60 px-2 py-0.5 text-xs font-medium text-primary">
                {isOrderView ? "Commande envoyée" : row.typeLabel}
              </span>
              <Badge variant={statusVariant}>{statusLabel}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-base font-semibold text-primary-dark">
              <span className="truncate">{fromName}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
              <span className="truncate">{toName}</span>
            </div>
            <p className="mt-1 text-sm text-muted">
              {isOrderView ? (
                <>
                  N° {formatTransferOrderNumber(transfer.id)}
                  {" · "}
                  Créée le {formatDate(transfer.created_at || transfer.sent_at)}
                  {" · "}
                  Envoyée le {formatDate(transfer.sent_at)}
                </>
              ) : (
                formatDate(transfer.sent_at)
              )}
            </p>
            {isOrderView && transfer.creator_name && (
              <p className="mt-1 text-sm text-muted">
                Envoyée par{" "}
                <span className="font-medium text-foreground">{transfer.creator_name}</span>
              </p>
            )}
            <p className="mt-1 text-sm text-muted">
              {transfer.items.length} produit
              {transfer.items.length !== 1 ? "s" : ""},{" "}
              {transfer.total_units} unité
              {transfer.total_units !== 1 ? "s" : ""}
            </p>
            <TransferAssignedLivreur
              name={transfer.assigned_livreur_name}
              className="mt-2"
            />
            {transfer.notes && (
              <p className="mt-2 rounded-lg bg-page px-3 py-2 text-sm text-muted">
                {transfer.notes}
              </p>
            )}
            {transfer.receiver_name && transfer.status === "received" && (
              <p className="mt-1 text-sm text-muted">
                Reçu par {transfer.receiver_name}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-primary/10 hover:text-primary-dark"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="max-h-[min(60vh,520px)] overflow-y-auto p-4 scrollbar-natus">
        {isOrderView && <OrderTimeline transfer={transfer} />}
        {useReceptionProducts ? (
          <TransferProductsTable
            transfer={transfer as HubStockTransfer}
            productsById={cashierHub.productsById}
            storeStockByProductId={cashierHub.storeStockByProductId}
          />
        ) : (
          <TransferItemsTable row={row} showImages={showProductImages} />
        )}
      </div>

      {isOrderView && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => printBonCommandeHtml(buildBonCommandeData(row, statusLabel))}
          >
            <Printer className="h-4 w-4" />
            Imprimer le bon de commande
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => downloadBonCommandeHtml(buildBonCommandeData(row, statusLabel))}
          >
            <Download className="h-4 w-4" />
            Télécharger
          </Button>
        </div>
      )}

      {canValidate && onValidate && (
        <div className="flex justify-end border-t border-border px-5 py-4">
          <Button type="button" loading={validateLoading} onClick={onValidate}>
            Valider la réception
          </Button>
        </div>
      )}
    </Modal>
  );
}
