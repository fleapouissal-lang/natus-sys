"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SelectMenu } from "@/components/ui/select-menu";
import { ProductImage } from "@/components/pos/product-image";
import {
  assignStoreTransferLivreur,
  confirmStoreStockTransfer,
  markStoreTransferReady,
  shipStoreStockTransfer,
} from "@/lib/actions";
import {
  storeTransferDestinationHint,
  storeTransferSourceHint,
  storeTransferStatusLabel,
  storeTransferStatusVariant,
} from "@/lib/store-transfer-status";
import { formatDate } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { Profile, StoreStockTransfer } from "@/lib/types";

export function StoreTransfersList({
  transfers,
  title,
  perspective,
  managedStoreIds,
  emptyMessage = "Aucune commande de transfert",
  actionMode = "full",
  livreurs = [],
}: {
  transfers: StoreStockTransfer[];
  title: string;
  perspective: "outgoing" | "incoming" | "all";
  managedStoreIds: string[];
  emptyMessage?: string;
  /** full = gérant/directeur/caisse source · receive-only = caisse destination · none = lecture seule */
  actionMode?: "full" | "receive-only" | "none";
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

  const filtered = transfers.filter((transfer) => {
    if (perspective === "outgoing") {
      return managedStoreIds.includes(transfer.from_store_id);
    }
    if (perspective === "incoming") {
      return managedStoreIds.includes(transfer.to_store_id);
    }
    return true;
  });

  const {
    paginated,
    page,
    setPage,
    totalPages,
    rangeStart,
    rangeEnd,
    totalItems,
  } = usePagination(filtered, DEFAULT_PAGE_SIZE);

  async function runAction(
    transferId: string,
    action: () => Promise<{ success?: true; error?: string }>
  ) {
    setMessage("");
    setLoadingId(transferId);
    const result = await action();
    setLoadingId(null);
    if ("error" in result && result.error) {
      setMessage(result.error);
      return;
    }
    setMessage("Commande mise à jour");
    router.refresh();
  }

  function canManageSource(transfer: StoreStockTransfer) {
    return managedStoreIds.includes(transfer.from_store_id);
  }

  function canManageDestination(transfer: StoreStockTransfer) {
    return managedStoreIds.includes(transfer.to_store_id);
  }

  if (filtered.length === 0) {
    return (
      <Card>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-2 text-sm text-muted">{emptyMessage}</p>
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
              <th className="px-6 py-3 text-left font-medium text-muted">Source</th>
              <th className="px-6 py-3 text-left font-medium text-muted">Destination</th>
              <th className="px-6 py-3 text-left font-medium text-muted">Produits</th>
              <th className="px-6 py-3 text-left font-medium text-muted">Statut</th>
              <th className="px-6 py-3 text-right font-medium text-muted">Unités</th>
              {actionMode !== "none" && (
                <th className="px-6 py-3 text-right font-medium text-muted">Action</th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginated.map((transfer) => {
              const sourceHint = canManageSource(transfer)
                ? storeTransferSourceHint(transfer.status)
                : "";
              const destHint = canManageDestination(transfer)
                ? storeTransferDestinationHint(transfer.status)
                : "";
              const hint = sourceHint || destHint;

              return (
                <tr key={transfer.id} className="border-b border-border last:border-b-0">
                  <td className="px-6 py-4 whitespace-nowrap">{formatDate(transfer.sent_at)}</td>
                  <td className="px-6 py-4 font-medium">{transfer.from_store_name || "—"}</td>
                  <td className="px-6 py-4 font-medium">{transfer.to_store_name || "—"}</td>
                  <td className="px-6 py-4">
                    <ul className="space-y-1">
                      {transfer.items.slice(0, 3).map((item) => (
                        <li key={item.id} className="flex items-center gap-2 text-xs text-muted">
                          <ProductImage
                            product={{
                              name: item.product_name,
                              image_url: item.product_image_url ?? null,
                              category: "",
                            }}
                            size="xs"
                            className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-border bg-page"
                          />
                          <span>
                            {item.product_name} × {item.quantity}
                          </span>
                        </li>
                      ))}
                      {transfer.items.length > 3 && (
                        <li className="text-xs text-muted">+{transfer.items.length - 3} autre(s)</li>
                      )}
                    </ul>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={storeTransferStatusVariant(transfer.status)}>
                      {storeTransferStatusLabel(transfer.status)}
                    </Badge>
                    {transfer.assigned_livreur_name && (
                      <p className="mt-1 text-xs text-muted">
                        Livreur : {transfer.assigned_livreur_name}
                      </p>
                    )}
                    {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
                  </td>
                  <td className="px-6 py-4 text-right font-medium">{transfer.total_units}</td>
                  {actionMode !== "none" && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end gap-2">
                        {actionMode === "full" &&
                          canManageSource(transfer) &&
                          transfer.status === "en_cours" && (
                            <Button
                              type="button"
                              size="sm"
                              loading={loadingId === transfer.id}
                              onClick={() =>
                                void runAction(transfer.id, () =>
                                  markStoreTransferReady(transfer.id)
                                )
                              }
                            >
                              Marquer prête
                            </Button>
                          )}

                        {actionMode === "full" &&
                          canManageSource(transfer) &&
                          transfer.status === "pret" && (
                            <div className="flex w-full min-w-[12rem] flex-col items-end gap-2">
                              <SelectMenu
                                value={
                                  selectedLivreur[transfer.id] ||
                                  transfer.assigned_livreur_id ||
                                  ""
                                }
                                onChange={(value) =>
                                  setSelectedLivreur((prev) => ({
                                    ...prev,
                                    [transfer.id]: value,
                                  }))
                                }
                                options={[
                                  { value: "", label: "Choisir un livreur" },
                                  ...livreurOptions,
                                ]}
                                size="sm"
                              />
                              {livreurOptions.length === 0 && (
                                <p className="text-xs text-muted">
                                  Aucun livreur actif dans la ville du magasin source
                                </p>
                              )}
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  loading={loadingId === transfer.id}
                                  disabled={
                                    !(
                                      selectedLivreur[transfer.id] ||
                                      transfer.assigned_livreur_id
                                    )
                                  }
                                  onClick={() =>
                                    void runAction(transfer.id, () =>
                                      assignStoreTransferLivreur(
                                        transfer.id,
                                        selectedLivreur[transfer.id] ||
                                          transfer.assigned_livreur_id ||
                                          ""
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
                                    void runAction(transfer.id, () =>
                                      shipStoreStockTransfer(transfer.id)
                                    )
                                  }
                                >
                                  Remettre au livreur
                                </Button>
                              </div>
                            </div>
                          )}

                        {canManageDestination(transfer) && transfer.status === "livre" && (
                          <Button
                            type="button"
                            size="sm"
                            loading={loadingId === transfer.id}
                            onClick={() =>
                              void runAction(transfer.id, () =>
                                confirmStoreStockTransfer(transfer.id)
                              )
                            }
                          >
                            Valider réception
                          </Button>
                        )}
                        {transfer.status === "received" && (
                          <span className="text-xs text-success">Terminé</span>
                        )}
                        {actionMode === "receive-only" &&
                          canManageDestination(transfer) &&
                          transfer.status === "en_livraison" && (
                            <span className="text-xs text-muted">En livraison</span>
                          )}
                      </div>
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
