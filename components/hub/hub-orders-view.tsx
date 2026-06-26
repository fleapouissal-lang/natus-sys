"use client";

import { HubTransfersList } from "@/components/hub/hub-transfers-list";
import type { HubStockTransfer, Profile } from "@/lib/types";

export function HubOrdersView({
  transfers,
  title = "Commandes dépôt",
  description,
  successMessage,
  readOnly = false,
  showOrigin = false,
  showProductImages = false,
  allowManage = false,
  allowRepair = false,
  livreurs = [],
}: {
  transfers: HubStockTransfer[];
  title?: string;
  description?: string;
  successMessage?: string;
  readOnly?: boolean;
  showOrigin?: boolean;
  showProductImages?: boolean;
  allowManage?: boolean;
  allowRepair?: boolean;
  livreurs?: Profile[];
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-muted">{description}</p>}
      </div>

      {successMessage && (
        <div className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          {successMessage}
        </div>
      )}

      <HubTransfersList
        transfers={transfers}
        title="Liste des commandes"
        readOnly={readOnly}
        showOrigin={showOrigin}
        showProductImages={showProductImages}
        allowManage={allowManage}
        allowRepair={allowRepair}
        livreurs={livreurs}
        emptyMessage={
          readOnly
            ? "Aucune commande dépôt pour vos magasins"
            : "Aucune commande de transfert pour le moment"
        }
      />
    </div>
  );
}
