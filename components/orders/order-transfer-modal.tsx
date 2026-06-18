"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowRightLeft, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StoreSelect } from "@/components/stores/store-select";
import {
  autoRouteShopifyOrder,
  suggestShopifyOrderRoute,
  transferShopifyOrder,
} from "@/lib/actions";
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
  const [routeReason, setRouteReason] = useState<string | null>(null);
  const [currentStoreCanFulfill, setCurrentStoreCanFulfill] = useState(false);
  const [loadingSuggestion, setLoadingSuggestion] = useState(true);
  const [manualMode, setManualMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function loadSuggestion() {
      setLoadingSuggestion(true);
      const result = await suggestShopifyOrderRoute(order.id);
      if (cancelled) return;

      if ("error" in result) {
        setError(result.error);
        setLoadingSuggestion(false);
        return;
      }

      setCurrentStoreCanFulfill(result.currentStoreCanFulfill);
      setRouteReason(result.reason);

      if (
        !result.currentStoreCanFulfill &&
        result.targetStoreId &&
        result.targetStoreId !== order.store_id
      ) {
        setTargetStoreId(result.targetStoreId);
      }

      setLoadingSuggestion(false);
    }

    loadSuggestion();
    return () => {
      cancelled = true;
    };
  }, [order.id, order.store_id]);

  function handleAutoRoute() {
    setError(null);
    startTransition(async () => {
      const result = await autoRouteShopifyOrder(order.id);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onTransferred();
      onClose();
    });
  }

  function handleManualTransfer() {
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
            {order.order_number} — routage selon le stock disponible
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

      {loadingSuggestion ? (
        <p className="text-sm text-muted">Analyse du stock en cours…</p>
      ) : currentStoreCanFulfill ? (
        <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
          Stock suffisant dans ce magasin — aucun transfert nécessaire.
        </p>
      ) : (
        <>
          {routeReason && (
            <p className="mb-4 rounded-lg bg-primary/5 px-3 py-2 text-sm text-foreground">
              {routeReason}
              {targetStore && !manualMode && (
                <>
                  {" "}
                  → <span className="font-medium">{targetStore.name}</span>
                </>
              )}
            </p>
          )}

          <p className="mb-4 text-sm text-muted">
            Priorité : magasin le plus proche avec tout le stock, puis un autre magasin
            de la ville, puis le hub de la ville s&apos;il a le stock complet.
          </p>

          {!manualMode ? (
            <button
              type="button"
              onClick={() => setManualMode(true)}
              className="text-sm text-primary underline-offset-2 hover:underline cursor-pointer"
            >
              Choisir manuellement la destination
            </button>
          ) : (
            <>
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
            </>
          )}

          {targetStore?.is_hub && (
            <p className="mt-2 text-xs text-primary">
              Hub stock de la ville — préparation centralisée
            </p>
          )}
        </>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
          {currentStoreCanFulfill ? "Fermer" : "Annuler"}
        </Button>
        {!currentStoreCanFulfill && !loadingSuggestion && (
          <Button
            type="button"
            onClick={manualMode ? handleManualTransfer : handleAutoRoute}
            loading={pending}
            disabled={manualMode && (availableTargets.length === 0 || !targetStoreId)}
          >
            <ArrowRightLeft className="h-4 w-4" />
            {manualMode ? "Transférer" : "Router automatiquement"}
          </Button>
        )}
      </div>
    </Modal>
  );
}
