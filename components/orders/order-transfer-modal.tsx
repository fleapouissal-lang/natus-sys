"use client";

import { useState, useTransition } from "react";
import { ArrowRightLeft, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StoreSelect } from "@/components/stores/store-select";
import { transferShopifyOrder } from "@/lib/actions";
import type { ShopifyOrder, Store } from "@/lib/types";

export function OrderTransferModal({
  order,
  targets,
  onClose,
  onTransferred,
}: {
  order: ShopifyOrder;
  targets: Store[];
  onClose: () => void;
  onTransferred: () => void;
}) {
  const availableTargets = targets.filter((store) => store.id !== order.store_id);
  const [targetStoreId, setTargetStoreId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleTransfer() {
    if (!targetStoreId) {
      setError("Choisissez un magasin de destination");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await transferShopifyOrder(order.id, targetStoreId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onTransferred();
      onClose();
    });
  }

  const targetStore = availableTargets.find((s) => s.id === targetStoreId);

  return (
    <Modal onClose={onClose} size="sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Transférer la commande</h3>
          <p className="mt-1 text-sm text-muted">
            {order.order_number} — la commande quittera votre magasin
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-muted hover:text-foreground cursor-pointer"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <p className="mb-4 text-sm text-muted">
        Transférez vers un autre magasin de la même ville ou vers le hub stock Casablanca
        si le stock est insuffisant chez vous.
      </p>

      {availableTargets.length === 0 ? (
        <p className="text-sm text-muted">Aucun magasin de destination disponible.</p>
      ) : (
        <StoreSelect
          stores={availableTargets}
          value={targetStoreId}
          onChange={setTargetStoreId}
          label="Magasin de destination"
          required
        />
      )}

      {targetStore?.is_hub && (
        <p className="mt-2 text-xs text-primary">
          Hub stock parent — préparation centralisée à Casablanca
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
          Annuler
        </Button>
        <Button
          type="button"
          onClick={handleTransfer}
          loading={pending}
          disabled={availableTargets.length === 0}
        >
          <ArrowRightLeft className="h-4 w-4" />
          Transférer
        </Button>
      </div>
    </Modal>
  );
}
