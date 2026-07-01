import type { ReceivedTransferRow } from "@/lib/stock-transfers/received-transfer-rows";

export type MesCommandesActionMode = "default" | "view-only" | "view-and-commander";
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

/** URL « Nouveau transfert » préremplie à partir d'une commande en cours. */
export function buildCommanderTransferUrl(
  role: CommanderRole,
  row: ReceivedTransferRow
): string {
  const transfer = row.transfer;
  const params = new URLSearchParams();
  params.set("tab", "new");

  if (row.source === "store") {
    params.set("from", transfer.from_store_id);
    params.set("to", transfer.to_store_id);
    params.set("dest", "store");
    return `${sentBasePath(role)}?${params.toString()}`;
  }

  const hubTransfer = row.transfer;
  const toHub = hubTransfer.to_store_is_hub;

  if (role === "hub") {
    params.set("store", hubTransfer.from_store_id);
    params.set("dest", toHub ? "hub" : "store");
    if (toHub) {
      params.set("hub", hubTransfer.to_store_id);
    } else {
      params.set("to", hubTransfer.to_store_id);
    }
    return `${sentBasePath(role)}?${params.toString()}`;
  }

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

  if (mode === "view-and-commander" && commanderRole) {
    return {
      ...base,
      commanderAction: {
        label: "Commander",
        onClick: () => onCommander(buildCommanderTransferUrl(commanderRole, row)),
      },
    };
  }

  return base;
}
