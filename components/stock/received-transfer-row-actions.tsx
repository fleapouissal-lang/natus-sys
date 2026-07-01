"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Eye,
  PackageCheck,
  PackagePlus,
  Truck,
  UserCheck,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SelectMenu } from "@/components/ui/select-menu";
import { TransferAssignedLivreur } from "@/components/stock/transfer-assigned-livreur";
import type { ReceivedTransferRow } from "@/lib/stock-transfers/received-transfer-rows";

function ActionIconButton({
  label,
  onClick,
  disabled,
  loading,
  children,
  variant = "default",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  variant?: "default" | "primary" | "success";
}) {
  const styles =
    variant === "primary"
      ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
      : variant === "success"
        ? "border-success/40 bg-success/5 text-success hover:bg-success/10"
        : "border-border bg-page text-muted hover:border-primary/30 hover:bg-primary-light/40 hover:text-primary";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled || loading}
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`order-action-icon flex h-8 w-8 shrink-0 items-center justify-center !p-0 border ${styles}`}
    >
      {children}
    </Button>
  );
}

type LivreurAssignConfig = {
  transferId: string;
  transferLabel: string;
  assignedLivreurId: string | null;
  assignedLivreurName: string | null;
  onAssign: (livreurId: string) => Promise<void>;
  onShip: () => Promise<void>;
  livreurOptions: { value: string; label: string }[];
  loading: boolean;
};

export function ReceivedTransferRowActions({
  onViewDetail,
  loading,
  primaryAction,
  livreurAssign,
  commanderAction,
}: {
  onViewDetail: () => void;
  loading?: boolean;
  primaryAction?: {
    label: string;
    icon: "ready" | "validate" | "repair";
    onClick: () => void;
    variant?: "primary" | "success";
  } | null;
  livreurAssign?: LivreurAssignConfig | null;
  commanderAction?: {
    label: string;
    onClick: () => void;
  };
}) {
  const [livreurOpen, setLivreurOpen] = useState(false);
  const [selectedLivreur, setSelectedLivreur] = useState("");

  const livreurId =
    selectedLivreur || livreurAssign?.assignedLivreurId || "";

  function openLivreurModal() {
    setSelectedLivreur(livreurAssign?.assignedLivreurId || "");
    setLivreurOpen(true);
  }

  async function handleAssign() {
    if (!livreurAssign || !livreurId) return;
    await livreurAssign.onAssign(livreurId);
    setLivreurOpen(false);
  }

  async function handleShip() {
    if (!livreurAssign) return;
    await livreurAssign.onShip();
    setLivreurOpen(false);
  }

  const primaryIcon =
    primaryAction?.icon === "validate" ? (
      <PackageCheck className="h-4 w-4" />
    ) : primaryAction?.icon === "repair" ? (
      <Wrench className="h-4 w-4" />
    ) : (
      <CheckCircle2 className="h-4 w-4" />
    );

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <ActionIconButton label="Voir le détail" onClick={onViewDetail}>
          <Eye className="h-4 w-4" />
        </ActionIconButton>

        {commanderAction && (
          <ActionIconButton
            label={commanderAction.label}
            onClick={commanderAction.onClick}
            loading={loading}
            variant="primary"
          >
            <ClipboardList className="h-4 w-4" />
          </ActionIconButton>
        )}

        {livreurAssign && (
          <ActionIconButton
            label="Assigner un livreur"
            onClick={openLivreurModal}
            loading={loading}
            variant="primary"
          >
            <Truck className="h-4 w-4" />
          </ActionIconButton>
        )}

        {primaryAction && (
          <ActionIconButton
            label={primaryAction.label}
            onClick={primaryAction.onClick}
            loading={loading}
            variant={primaryAction.variant ?? "success"}
          >
            {primaryIcon}
          </ActionIconButton>
        )}
      </div>

      {livreurAssign && livreurOpen && (
        <Modal onClose={() => setLivreurOpen(false)} size="md">
          <div className="space-y-4">
            <div>
              <h3 className="font-heading text-lg font-semibold text-primary-dark">
                Assignation livreur
              </h3>
              <p className="mt-1 text-sm text-muted">{livreurAssign.transferLabel}</p>
              <TransferAssignedLivreur
                name={livreurAssign.assignedLivreurName}
                className="mt-2"
              />
            </div>

            <SelectMenu
              label="Livreur"
              value={livreurId}
              onChange={setSelectedLivreur}
              options={[
                { value: "", label: "Choisir un livreur" },
                ...livreurAssign.livreurOptions,
              ]}
              size="sm"
            />

            {livreurAssign.livreurOptions.length === 0 && (
              <p className="text-sm text-muted">
                Aucun livreur actif disponible pour la ville de prise en charge.
              </p>
            )}
            <p className="text-xs text-muted">
              Un même livreur peut être assigné à plusieurs transferts en parallèle.
            </p>

            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setLivreurOpen(false)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="secondary"
                loading={livreurAssign.loading}
                disabled={!livreurId}
                onClick={() => void handleAssign()}
              >
                <UserCheck className="h-4 w-4" />
                Confirmer l&apos;assignation
              </Button>
              <Button
                type="button"
                loading={livreurAssign.loading}
                disabled={!livreurAssign.assignedLivreurId && !livreurId}
                onClick={() => void handleShip()}
              >
                <Truck className="h-4 w-4" />
                Remettre au livreur
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export function buildStoreRowActions(args: {
  row: ReceivedTransferRow & { source: "store" };
  storeActionMode: "none" | "receive-only" | "full";
  canManageSource: boolean;
  canManageDestination: boolean;
  loading: boolean;
  livreurOptions: { value: string; label: string }[];
  onViewDetail: () => void;
  onMarkReady: () => void;
  onAssignLivreur: (livreurId: string) => void;
  onShip: () => void;
  onConfirmReceive: () => void;
}): {
  onViewDetail: () => void;
  loading?: boolean;
  primaryAction?: Parameters<typeof ReceivedTransferRowActions>[0]["primaryAction"];
  livreurAssign?: LivreurAssignConfig | null;
} {
  const transfer = args.row.transfer;
  const label = `${transfer.from_store_name || "—"} → ${transfer.to_store_name || "—"}`;

  if (args.storeActionMode === "full" && args.canManageSource && transfer.status === "en_cours") {
    return {
      onViewDetail: args.onViewDetail,
      loading: args.loading,
      primaryAction: {
        label: "Marquer prête",
        icon: "ready",
        onClick: args.onMarkReady,
        variant: "primary",
      },
    };
  }

  if (
    args.storeActionMode === "full" &&
    args.canManageSource &&
    transfer.status === "pret"
  ) {
    return {
      onViewDetail: args.onViewDetail,
      loading: args.loading,
      livreurAssign: {
        transferId: transfer.id,
        transferLabel: label,
        assignedLivreurId: transfer.assigned_livreur_id,
        assignedLivreurName: transfer.assigned_livreur_name ?? null,
        livreurOptions: args.livreurOptions,
        loading: args.loading,
        onAssign: async (livreurId) => args.onAssignLivreur(livreurId),
        onShip: async () => args.onShip(),
      },
    };
  }

  if (args.canManageDestination && transfer.status === "livre") {
    return {
      onViewDetail: args.onViewDetail,
      loading: args.loading,
      primaryAction: {
        label: "Valider réception",
        icon: "validate",
        onClick: args.onConfirmReceive,
        variant: "success",
      },
    };
  }

  return { onViewDetail: args.onViewDetail, loading: args.loading };
}

export function buildHubRowActions(args: {
  row: ReceivedTransferRow & { source: "hub" };
  allowManage: boolean;
  canMarkReady: boolean;
  canManageLivreur: boolean;
  isStoreToDepot: boolean;
  hubManageAsStoreSource: boolean;
  hubAllowRepair: boolean;
  cashierCanValidate: boolean;
  loading: boolean;
  livreurOptions: { value: string; label: string }[];
  onViewDetail: () => void;
  onMarkReady: () => void;
  onAssignLivreur: (livreurId: string) => void;
  onShip: () => void;
  onConfirmReceive: () => void;
  onRepair: () => void;
  onCashierValidate: () => void;
  cashierHub: boolean;
}): Parameters<typeof ReceivedTransferRowActions>[0] {
  const transfer = args.row.transfer;
  const label = `${transfer.from_store_name || "—"} → ${transfer.to_store_name || "—"}`;

  if (args.cashierHub && args.cashierCanValidate) {
    return {
      onViewDetail: args.onViewDetail,
      loading: args.loading,
      primaryAction: {
        label: "Valider réception",
        icon: "validate",
        onClick: args.onCashierValidate,
        variant: "success",
      },
    };
  }

  if (args.allowManage && transfer.status === "en_cours" && args.canMarkReady) {
    return {
      onViewDetail: args.onViewDetail,
      loading: args.loading,
      primaryAction: {
        label: "Marquer prête",
        icon: "ready",
        onClick: args.onMarkReady,
        variant: "primary",
      },
    };
  }

  if (args.allowManage && transfer.status === "pret" && args.canManageLivreur) {
    return {
      onViewDetail: args.onViewDetail,
      loading: args.loading,
      livreurAssign: {
        transferId: transfer.id,
        transferLabel: label,
        assignedLivreurId: transfer.assigned_livreur_id,
        assignedLivreurName: transfer.assigned_livreur_name ?? null,
        livreurOptions: args.livreurOptions,
        loading: args.loading,
        onAssign: async (livreurId) => args.onAssignLivreur(livreurId),
        onShip: async () => args.onShip(),
      },
    };
  }

  if (
    args.allowManage &&
    !args.hubManageAsStoreSource &&
    transfer.status === "livre" &&
    args.isStoreToDepot
  ) {
    return {
      onViewDetail: args.onViewDetail,
      loading: args.loading,
      primaryAction: {
        label: "Valider réception dépôt",
        icon: "validate",
        onClick: args.onConfirmReceive,
        variant: "success",
      },
    };
  }

  if (args.hubAllowRepair && transfer.status === "received") {
    return {
      onViewDetail: args.onViewDetail,
      loading: args.loading,
      primaryAction: {
        label: "Réparer stock",
        icon: "repair",
        onClick: args.onRepair,
        variant: "primary",
      },
    };
  }

  return { onViewDetail: args.onViewDetail, loading: args.loading };
}
