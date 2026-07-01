"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
  ReceivedTransferDetailModal,
  type TransferDetailVariant,
} from "@/components/stock/received-transfer-detail-modal";
import {
  ReceivedTransferRowActions,
  buildHubRowActions,
  buildStoreRowActions,
} from "@/components/stock/received-transfer-row-actions";
import { TransferAssignedLivreur } from "@/components/stock/transfer-assigned-livreur";
import {
  assignHubTransferLivreur,
  assignStoreToHubTransferLivreur,
  assignStoreTransferLivreur,
  confirmHubStockTransfer,
  confirmStoreStockTransfer,
  markHubTransferReady,
  markStoreToHubTransferReady,
  markStoreTransferReady,
  pickupHubTransfer,
  repairHubStockTransfer,
  shipStoreStockTransfer,
} from "@/lib/actions";
import {
  hubTransferDirection,
  hubTransferManagedFromSourceHub,
} from "@/lib/hub-transfer-direction";
import {
  filterLivreursForPickupCity,
  mapLivreurSelectOptions,
  pickupCityForTransferLivreur,
  resolveTransferLivreurName,
} from "@/lib/transfer-livreur-assignment";
import {
  hubTransferCashierCanValidate,
  hubTransferStatusLabel,
  hubTransferStatusVariant,
  hubTransferStoreStatusHint,
} from "@/lib/hub-transfer-status";
import {
  storeTransferDestinationHint,
  storeTransferSourceHint,
  storeTransferStatusLabel,
  storeTransferStatusVariant,
} from "@/lib/store-transfer-status";
import type { ReceivedTransferRow } from "@/lib/stock-transfers/received-transfer-rows";
import {
  applyMesCommandesRowActions,
  type CommanderRole,
  type MesCommandesActionMode,
} from "@/lib/stock-transfers/pending-order-actions";
import {
  buildBonCommandeData,
  printBonCommandeHtml,
  printBonLivraisonHtml,
  type TransferDocumentKind,
} from "@/lib/stock-transfers/download-bon-commande";
import { TransferEditItemsModal } from "@/components/stock/transfer-edit-items-modal";
import { formatDate } from "@/lib/utils";
import { formatTransferOrderNumber } from "@/lib/stock-transfers/source-order-history";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { Product, Profile } from "@/lib/types";

export type ReceivedTransfersListProps = {
  rows: ReceivedTransferRow[];
  managedStoreIds: string[];
  title?: string;
  emptyMessage?: string;
  showProductImages?: boolean;
  livreurs?: Profile[];
  storeActionMode?: "none" | "receive-only" | "full";
  hubReadOnly?: boolean;
  hubAllowRepair?: boolean;
  hubManageAsStoreSource?: boolean;
  /** Hub opérateur : gère les envois depuis le dépôt source */
  hubManageOutgoing?: boolean;
  mesCommandesActionMode?: MesCommandesActionMode;
  commanderRole?: CommanderRole;
  detailVariant?: TransferDetailVariant;
  /** Si défini, l'œil ouvre directement le PDF (bon de commande / livraison) au lieu du modal. */
  documentOnView?: TransferDocumentKind;
  /** Autorise la modification des produits d'une commande non encore remise au livreur. */
  allowEditItems?: boolean;
  cashierHub?: {
    storeName: string;
    productsById: Record<
      string,
      Pick<Product, "id" | "name" | "barcode" | "image_url" | "category">
    >;
    storeStockByProductId: Record<string, number>;
  };
};

function hubRowAllowManage(
  row: ReceivedTransferRow & { source: "hub" },
  hubReadOnly: boolean,
  hubManageOutgoing: boolean,
  managedStoreIds: string[]
): boolean {
  if (hubReadOnly) return false;
  if (
    hubManageOutgoing &&
    row.transfer.from_store_is_hub &&
    managedStoreIds.includes(row.transfer.from_store_id)
  ) {
    return true;
  }
  return row.filterKind === "depot";
}

export function ReceivedTransfersList({
  rows,
  managedStoreIds,
  title = "Transferts reçus",
  emptyMessage = "Aucun transfert reçu",
  showProductImages = false,
  livreurs = [],
  storeActionMode = "none",
  hubReadOnly = true,
  hubAllowRepair = false,
  hubManageAsStoreSource = false,
  hubManageOutgoing = false,
  mesCommandesActionMode,
  commanderRole,
  detailVariant = "reception",
  documentOnView,
  allowEditItems = false,
  cashierHub,
}: ReceivedTransfersListProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [detailRow, setDetailRow] = useState<ReceivedTransferRow | null>(null);
  const [editRow, setEditRow] = useState<ReceivedTransferRow | null>(null);

  function livreurOptionsForTransfer(transfer: {
    from_store_city?: string | null;
  }) {
    return mapLivreurSelectOptions(
      filterLivreursForPickupCity(
        livreurs,
        pickupCityForTransferLivreur(transfer)
      )
    );
  }

  function livreurNameFor(transfer: ReceivedTransferRow["transfer"]) {
    return resolveTransferLivreurName(transfer, livreurs);
  }

  const {
    paginated,
    page,
    setPage,
    totalPages,
    rangeStart,
    rangeEnd,
    totalItems,
  } = usePagination(rows, DEFAULT_PAGE_SIZE);

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

  function canManageStoreSource(transfer: ReceivedTransferRow["transfer"]) {
    return (
      transfer &&
      "from_store_id" in transfer &&
      managedStoreIds.includes(transfer.from_store_id)
    );
  }

  function canManageStoreDestination(transfer: ReceivedTransferRow["transfer"]) {
    return (
      transfer &&
      "to_store_id" in transfer &&
      managedStoreIds.includes(transfer.to_store_id)
    );
  }

  const detailCanValidate =
    detailRow?.source === "hub" &&
    cashierHub &&
    hubTransferCashierCanValidate(detailRow.transfer.status);

  const isOrderView = detailVariant === "order";

  if (rows.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted">{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <>
      <Card padding={false}>
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted">
            {totalItems} transfert{totalItems !== 1 ? "s" : ""}
          </p>
          {message && <p className="mt-2 text-sm text-muted">{message}</p>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-primary-light/30">
                {isOrderView && (
                  <th className="px-6 py-3 text-left font-medium text-muted">N° commande</th>
                )}
                <th className="px-6 py-3 text-left font-medium text-muted">
                  {isOrderView ? "Envoyée" : "Date"}
                </th>
                {isOrderView && (
                  <th className="px-6 py-3 text-left font-medium text-muted">Créée</th>
                )}
                <th className="px-6 py-3 text-left font-medium text-muted">Source</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Destination</th>
                {isOrderView && (
                  <th className="px-6 py-3 text-left font-medium text-muted">Envoyé par</th>
                )}
                {!isOrderView && (
                  <th className="px-6 py-3 text-left font-medium text-muted">Livreur</th>
                )}
                <th className="px-6 py-3 text-left font-medium text-muted">Statut</th>
                <th className="px-6 py-3 text-right font-medium text-muted">Unités</th>
                <th className="px-6 py-3 text-right font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((row) => {
                const loading = loadingId === row.transfer.id;
                const rowStatusLabel =
                  row.source === "store"
                    ? storeTransferStatusLabel(row.transfer.status)
                    : hubTransferStatusLabel(row.transfer.status);
                // Bon de commande : toujours en PDF sur l'œil.
                // Bon de livraison : PDF seulement quand la commande est bien livrée
                // (statut « received »), sinon on affiche le détail dans le modal.
                const openLivraisonPdf =
                  documentOnView === "livraison" &&
                  row.transfer.status === "received";
                const openCommandePdf = documentOnView === "commande";
                const onViewDetail = openLivraisonPdf
                  ? () =>
                      printBonLivraisonHtml(buildBonCommandeData(row, rowStatusLabel))
                  : openCommandePdf
                    ? () =>
                        printBonCommandeHtml(buildBonCommandeData(row, rowStatusLabel))
                    : () => setDetailRow(row);

                if (row.source === "store") {
                  const transfer = row.transfer;
                  const sourceHint =
                    detailVariant === "order"
                      ? ""
                      : canManageStoreSource(transfer)
                        ? storeTransferSourceHint(transfer.status)
                        : "";
                  const destHint =
                    detailVariant === "order"
                      ? ""
                      : canManageStoreDestination(transfer)
                        ? storeTransferDestinationHint(transfer.status)
                        : "";
                  const hint = sourceHint || destHint;
                  const actionProps = applyMesCommandesRowActions(
                    mesCommandesActionMode,
                    commanderRole,
                    row,
                    buildStoreRowActions({
                      row,
                      storeActionMode,
                      canManageSource: canManageStoreSource(transfer),
                      canManageDestination: canManageStoreDestination(transfer),
                      loading,
                      livreurOptions: livreurOptionsForTransfer(transfer),
                      onViewDetail,
                      onMarkReady: () =>
                        void runAction(transfer.id, () =>
                          markStoreTransferReady(transfer.id)
                        ),
                      onAssignLivreur: (livreurId) =>
                        runAction(transfer.id, () =>
                          assignStoreTransferLivreur(transfer.id, livreurId)
                        ),
                      onShip: () =>
                        runAction(transfer.id, () =>
                          shipStoreStockTransfer(transfer.id)
                        ),
                      onConfirmReceive: () =>
                        void runAction(transfer.id, () =>
                          confirmStoreStockTransfer(transfer.id)
                        ),
                    }),
                    (url) => router.push(url)
                  );

                  const canEditStore =
                    allowEditItems &&
                    canManageStoreSource(transfer) &&
                    (transfer.status === "en_cours" || transfer.status === "pret") &&
                    !transfer.shipped_at &&
                    !transfer.picked_up_at;

                  return (
                    <tr key={row.id} className="border-b border-border last:border-b-0">
                      {isOrderView && (
                        <td className="px-6 py-4 font-mono text-xs font-semibold text-primary">
                          {formatTransferOrderNumber(transfer.id)}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {formatDate(transfer.sent_at)}
                      </td>
                      {isOrderView && (
                        <td className="px-6 py-4 whitespace-nowrap text-muted">
                          {formatDate(transfer.created_at || transfer.sent_at)}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <p className="font-medium">{transfer.from_store_name || "—"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium">{transfer.to_store_name || "—"}</p>
                      </td>
                      {isOrderView ? (
                        <td className="px-6 py-4 text-sm text-muted">
                          {transfer.creator_name || "—"}
                        </td>
                      ) : (
                        <td className="px-6 py-4">
                          <TransferAssignedLivreur
                            name={livreurNameFor(transfer)}
                            compact
                            className=""
                          />
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <Badge variant={storeTransferStatusVariant(transfer.status)}>
                          {storeTransferStatusLabel(transfer.status)}
                        </Badge>
                        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
                      </td>
                      <td className="px-6 py-4 text-right font-medium tabular-nums">
                        {transfer.total_units}
                      </td>
                      <td className="px-6 py-4">
                        <ReceivedTransferRowActions
                          {...actionProps}
                          onEditItems={canEditStore ? () => setEditRow(row) : undefined}
                        />
                      </td>
                    </tr>
                  );
                }

                const transfer = row.transfer;
                const allowManage = hubRowAllowManage(
                  row,
                  hubReadOnly,
                  hubManageOutgoing,
                  managedStoreIds
                );
                const statusHint =
                  detailVariant === "order"
                    ? ""
                    : hubReadOnly || cashierHub
                      ? hubTransferStoreStatusHint(transfer.status)
                      : "";
                const direction = hubTransferDirection(transfer);
                const isStoreToDepot = direction === "store_to_depot";
                const managedFromSourceHub = hubTransferManagedFromSourceHub(
                  direction,
                  hubManageAsStoreSource
                );
                const canMarkReady = managedFromSourceHub;
                const canManageLivreur = managedFromSourceHub;
                const actionProps = applyMesCommandesRowActions(
                  mesCommandesActionMode,
                  commanderRole,
                  row,
                  buildHubRowActions({
                    row,
                    allowManage,
                    canMarkReady,
                    canManageLivreur,
                    isStoreToDepot,
                    hubManageAsStoreSource,
                    hubAllowRepair,
                    cashierCanValidate: cashierHub
                      ? hubTransferCashierCanValidate(transfer.status)
                      : false,
                    cashierHub: Boolean(cashierHub),
                    loading,
                    livreurOptions: livreurOptionsForTransfer(transfer),
                    onViewDetail,
                    onMarkReady: () =>
                      void runAction(transfer.id, () =>
                        hubManageAsStoreSource && isStoreToDepot
                          ? markStoreToHubTransferReady(transfer.id)
                          : markHubTransferReady(transfer.id)
                      ),
                    onAssignLivreur: (livreurId) =>
                      runAction(transfer.id, () =>
                        hubManageAsStoreSource && isStoreToDepot
                          ? assignStoreToHubTransferLivreur(transfer.id, livreurId)
                          : assignHubTransferLivreur(transfer.id, livreurId)
                      ),
                    onShip: () =>
                      runAction(transfer.id, () => pickupHubTransfer(transfer.id)),
                    onConfirmReceive: () =>
                      void runAction(transfer.id, () =>
                        confirmHubStockTransfer(transfer.id)
                      ),
                    onRepair: () =>
                      void runAction(transfer.id, () =>
                        repairHubStockTransfer(transfer.id)
                      ),
                    onCashierValidate: () =>
                      void runAction(transfer.id, () =>
                        confirmHubStockTransfer(transfer.id)
                      ),
                  }),
                  (url) => router.push(url)
                );

                const canEditHub =
                  allowEditItems &&
                  allowManage &&
                  (transfer.status === "en_cours" || transfer.status === "pret") &&
                  !transfer.picked_up_at;

                return (
                  <tr key={row.id} className="border-b border-border last:border-b-0">
                    {isOrderView && (
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-primary">
                        {formatTransferOrderNumber(transfer.id)}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDate(transfer.sent_at)}
                    </td>
                    {isOrderView && (
                      <td className="px-6 py-4 whitespace-nowrap text-muted">
                        {formatDate(transfer.created_at || transfer.sent_at)}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <p className="font-medium">
                        {transfer.from_store_name ||
                          (cashierHub ? "Entrepôt hub" : "—")}
                      </p>
                      {isStoreToDepot && transfer.from_store_city && (
                        <p className="text-xs text-muted">{transfer.from_store_city}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium">
                        {transfer.to_store_name || cashierHub?.storeName || "—"}
                      </p>
                      {transfer.receiver_name && transfer.status === "received" && (
                        <p className="text-xs text-muted">Reçu par {transfer.receiver_name}</p>
                      )}
                    </td>
                    {isOrderView ? (
                      <td className="px-6 py-4 text-sm text-muted">
                        {transfer.creator_name || "—"}
                      </td>
                    ) : (
                      <td className="px-6 py-4">
                        <TransferAssignedLivreur
                          name={livreurNameFor(transfer)}
                          compact
                          className=""
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <Badge variant={hubTransferStatusVariant(transfer.status)}>
                        {hubTransferStatusLabel(transfer.status)}
                      </Badge>
                      {statusHint && <p className="mt-1 text-xs text-muted">{statusHint}</p>}
                    </td>
                    <td className="px-6 py-4 text-right font-medium tabular-nums">
                      {transfer.total_units}
                    </td>
                    <td className="px-6 py-4">
                      <ReceivedTransferRowActions
                        {...actionProps}
                        onEditItems={canEditHub ? () => setEditRow(row) : undefined}
                      />
                    </td>
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

      <ReceivedTransferDetailModal
        row={detailRow}
        onClose={() => setDetailRow(null)}
        showProductImages={showProductImages}
        detailVariant={detailVariant}
        cashierHub={detailVariant === "order" ? undefined : cashierHub}
        canValidate={Boolean(detailCanValidate)}
        validateLoading={detailRow ? loadingId === detailRow.transfer.id : false}
        onValidate={
          detailRow
            ? () => {
                void (async () => {
                  await runAction(detailRow.transfer.id, () =>
                    confirmHubStockTransfer(detailRow.transfer.id)
                  );
                  setDetailRow(null);
                })();
              }
            : undefined
        }
      />

      {editRow && (
        <TransferEditItemsModal
          row={editRow}
          onClose={() => setEditRow(null)}
          onSaved={() => {
            setMessage("Commande modifiée");
            router.refresh();
          }}
        />
      )}
    </>
  );
}
