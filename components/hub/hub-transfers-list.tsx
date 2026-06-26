"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SelectMenu } from "@/components/ui/select-menu";
import {
  assignHubTransferLivreur,
  markHubTransferReady,
  pickupHubTransfer,
  repairHubStockTransfer,
} from "@/lib/actions";
import { ProductImage } from "@/components/pos/product-image";
import {
  hubTransferStatusLabel,
  hubTransferStatusVariant,
  hubTransferStoreStatusHint,
} from "@/lib/hub-transfer-status";
import { formatDate } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { HubStockTransfer, Profile } from "@/lib/types";

export function HubTransfersList({
  transfers,
  title = "Commandes de transfert",
  allowRepair = false,
  allowManage = false,
  readOnly = false,
  showOrigin = false,
  showProductImages = false,
  emptyMessage = "Aucune commande de transfert pour le moment",
  livreurs = [],
}: {
  transfers: HubStockTransfer[];
  title?: string;
  allowRepair?: boolean;
  allowManage?: boolean;
  readOnly?: boolean;
  showOrigin?: boolean;
  showProductImages?: boolean;
  emptyMessage?: string;
  livreurs?: Profile[];
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [selectedLivreur, setSelectedLivreur] = useState<Record<string, string>>({});

  const livreurOptions = livreurs.map((livreur) => ({
    value: livreur.id,
    label: livreur.full_name || livreur.email,
  }));

  const {
    paginated,
    page,
    setPage,
    totalPages,
    rangeStart,
    rangeEnd,
    totalItems,
  } = usePagination(transfers, DEFAULT_PAGE_SIZE);

  async function runAction(
    transferId: string,
    action: () => Promise<{ success?: true; error?: string; credited?: number }>
  ) {
    setMessage("");
    setLoadingId(transferId);
    const result = await action();
    setLoadingId(null);

    if ("error" in result && result.error) {
      setMessage(result.error);
      return;
    }

    if ("credited" in result && typeof result.credited === "number") {
      setMessage(
        result.credited > 0
          ? `Stock réparé pour ${result.credited} produit(s)`
          : "Le stock était déjà à jour"
      );
    } else {
      setMessage("Commande mise à jour");
    }
    router.refresh();
  }

  if (transfers.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted">{emptyMessage}</p>
      </Card>
    );
  }

  const showActions = !readOnly && (allowManage || allowRepair);

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
              {showOrigin && (
                <th className="px-6 py-3 text-left font-medium text-muted">Dépôt</th>
              )}
              <th className="px-6 py-3 text-left font-medium text-muted">
                {showOrigin ? "Magasin" : "Destination"}
              </th>
              <th className="px-6 py-3 text-left font-medium text-muted">Produits</th>
              <th className="px-6 py-3 text-left font-medium text-muted">Statut</th>
              <th className="px-6 py-3 text-right font-medium text-muted">Unités</th>
              {showActions && (
                <th className="px-6 py-3 text-right font-medium text-muted">Action</th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginated.map((transfer) => {
              const statusHint = readOnly ? hubTransferStoreStatusHint(transfer.status) : "";
              return (
              <tr key={transfer.id} className="border-b border-border last:border-b-0">
                <td className="px-6 py-4 whitespace-nowrap">
                  {formatDate(transfer.sent_at)}
                </td>
                {showOrigin && (
                  <td className="px-6 py-4">
                    <p className="font-medium">{transfer.from_store_name || "Entrepôt"}</p>
                  </td>
                )}
                <td className="px-6 py-4">
                  <p className="font-medium">{transfer.to_store_name || "—"}</p>
                  {transfer.assigned_livreur_name && (
                    <p className="text-xs text-muted">Livreur : {transfer.assigned_livreur_name}</p>
                  )}
                  {transfer.receiver_name && transfer.status === "received" && (
                    <p className="text-xs text-muted">Reçu par {transfer.receiver_name}</p>
                  )}
                </td>
                <td className="px-6 py-4">
                  <ul className="space-y-2">
                    {transfer.items.slice(0, showProductImages ? 4 : 3).map((item) => (
                      <li key={item.id} className="flex items-center gap-2 text-xs text-muted">
                        {showProductImages && (
                          <ProductImage
                            product={{
                              id: item.product_id,
                              name: item.product_name,
                              barcode: item.product_barcode,
                              image_url: item.product_image_url,
                            }}
                            size="xs"
                            className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-border bg-page"
                          />
                        )}
                        <span>
                          {item.product_name} × {item.quantity}
                        </span>
                      </li>
                    ))}
                    {transfer.items.length > (showProductImages ? 4 : 3) && (
                      <li className="text-xs text-muted">
                        +{transfer.items.length - (showProductImages ? 4 : 3)} autre(s)
                      </li>
                    )}
                  </ul>
                </td>
                <td className="px-6 py-4">
                  <Badge variant={hubTransferStatusVariant(transfer.status)}>
                    {hubTransferStatusLabel(transfer.status)}
                  </Badge>
                  {statusHint && (
                    <p className="mt-1 text-xs text-muted">{statusHint}</p>
                  )}
                  {transfer.ready_at && transfer.status !== "en_cours" && (
                    <p className="mt-1 text-xs text-muted">Prête : {formatDate(transfer.ready_at)}</p>
                  )}
                  {transfer.picked_up_at && (
                    <p className="mt-1 text-xs text-muted">
                      Prise en charge : {formatDate(transfer.picked_up_at)}
                    </p>
                  )}
                  {transfer.status === "received" && transfer.received_at && (
                    <p className="mt-1 text-xs text-muted">
                      {formatDate(transfer.received_at)}
                    </p>
                  )}
                </td>
                <td className="px-6 py-4 text-right font-medium">
                  {transfer.total_units}
                </td>
                {showActions && (
                  <td className="px-6 py-4 text-right">
                    {allowManage && transfer.status === "en_cours" && (
                      <Button
                        type="button"
                        size="sm"
                        loading={loadingId === transfer.id}
                        onClick={() =>
                          void runAction(transfer.id, () => markHubTransferReady(transfer.id))
                        }
                      >
                        Marquer prête
                      </Button>
                    )}

                    {allowManage && transfer.status === "pret" && (
                      <div className="flex flex-col items-end gap-2">
                        <SelectMenu
                          value={selectedLivreur[transfer.id] || transfer.assigned_livreur_id || ""}
                          onChange={(value) =>
                            setSelectedLivreur((prev) => ({ ...prev, [transfer.id]: value }))
                          }
                          options={[
                            { value: "", label: "Choisir un livreur" },
                            ...livreurOptions,
                          ]}
                          size="sm"
                        />
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            loading={loadingId === transfer.id}
                            disabled={!(selectedLivreur[transfer.id] || transfer.assigned_livreur_id)}
                            onClick={() =>
                              void runAction(transfer.id, () =>
                                assignHubTransferLivreur(
                                  transfer.id,
                                  selectedLivreur[transfer.id] || transfer.assigned_livreur_id || ""
                                )
                              )
                            }
                          >
                            Assigner livreur
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            loading={loadingId === transfer.id}
                            disabled={!transfer.assigned_livreur_id}
                            onClick={() =>
                              void runAction(transfer.id, () => pickupHubTransfer(transfer.id))
                            }
                          >
                            Remettre au livreur
                          </Button>
                        </div>
                      </div>
                    )}

                    {allowRepair && transfer.status === "received" && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        loading={loadingId === transfer.id}
                        onClick={() =>
                          void runAction(transfer.id, () => repairHubStockTransfer(transfer.id))
                        }
                      >
                        Réparer stock
                      </Button>
                    )}

                    {!allowManage && transfer.status !== "received" && (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                )}
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
      <PaginationBar
        page={page}
        totalPages={totalPages}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        totalItems={totalItems}
        onPageChange={setPage}
      />
    </Card>
  );
}
