import type { ReceivedTransferRow } from "@/lib/stock-transfers/received-transfer-rows";

export type MesCommandesActionMode =
  | "default"
  | "view-only"
  | "view-and-ready"
  | "view-and-prepare"
  /** @deprecated Utiliser view-and-prepare */
  | "view-and-commander";
export type CommanderRole = "cashier" | "hub";

export type MesCommandesRowActions = {
  onViewDetail: () => void;
  loading?: boolean;
  primaryAction?: {
    label: string;
    icon: "ready" | "validate" | "repair";
    onClick: () => void;
    variant?: "primary" | "success";
  } | null;
  livreurAssign?: {
    transferId: string;
    transferLabel: string;
    assignedLivreurId: string | null;
    assignedLivreurName: string | null;
    onAssign: (livreurId: string) => Promise<void>;
    onShip: () => Promise<void>;
    livreurOptions: { value: string; label: string }[];
    loading: boolean;
  } | null;
  commanderAction?: {
    label: string;
    onClick: () => void;
  };
};

function sentBasePath(role: CommanderRole): string {
  return role === "cashier" ? "/cashier/transfers/sent" : "/hub/stock-transfers";
}

/** URL « Nouveau transfert » préremplie à partir d'une commande en attente. */
export function buildPrepareOrderTransferUrl(
  role: CommanderRole,
  row: ReceivedTransferRow
): string {
  const transfer = row.transfer;
  const params = new URLSearchParams();
  params.set("tab", "new");
  params.set("order", transfer.id);

  if (row.source === "store") {
    params.set("kind", "store");
    params.set("from", transfer.from_store_id);
    params.set("to", transfer.to_store_id);
    params.set("dest", "store");
    return `${sentBasePath(role)}?${params.toString()}`;
  }

  const hubTransfer = row.transfer;
  const toHub = hubTransfer.to_store_is_hub;

  if (role === "hub") {
    params.set("kind", "hub");
    params.set("store", hubTransfer.from_store_id);
    params.set("dest", toHub ? "hub" : "store");
    if (toHub) {
      params.set("hub", hubTransfer.to_store_id);
    } else {
      params.set("to", hubTransfer.to_store_id);
    }
    return `${sentBasePath(role)}?${params.toString()}`;
  }

  params.set("kind", "hub");
  params.set("from", hubTransfer.from_store_id);
  params.set("dest", toHub ? "hub" : "store");
  if (toHub) {
    params.set("hub", hubTransfer.to_store_id);
  } else {
    params.set("to", hubTransfer.to_store_id);
  }
  return `${sentBasePath(role)}?${params.toString()}`;
}

export function applyMesCommandesRowActions(
  mode: MesCommandesActionMode | undefined,
  commanderRole: CommanderRole | undefined,
  row: ReceivedTransferRow,
  defaultActions: MesCommandesRowActions,
  onCommander: (url: string) => void
): MesCommandesRowActions {
  if (!mode || mode === "default") {
    return defaultActions;
  }

  const base: MesCommandesRowActions = {
    onViewDetail: defaultActions.onViewDetail,
    loading: defaultActions.loading,
  };

  if (mode === "view-only") {
    return base;
  }

  if (mode === "view-and-ready") {
    const ready =
      defaultActions.primaryAction?.label === "Marquer prête"
        ? defaultActions.primaryAction
        : null;
    return {
      ...base,
      primaryAction: ready,
    };
  }

  if (mode === "view-and-prepare" || mode === "view-and-commander") {
    if (commanderRole) {
      return {
        ...base,
        commanderAction: {
          label: "Préparer la commande",
          onClick: () => onCommander(buildPrepareOrderTransferUrl(commanderRole, row)),
        },
      };
    }
  }

  return base;
}

/** @deprecated Utiliser buildPrepareOrderTransferUrl */
export const buildCommanderTransferUrl = buildPrepareOrderTransferUrl;
