"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { SelectMenu } from "@/components/ui/select-menu";
import { createCashierStoreTransfer } from "@/lib/actions";
import type { CashierWithStore } from "@/lib/scheduling/shifts";
import type { Store } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CashierTransferModal({
  cashier,
  stores,
  currentStoreId,
  onClose,
}: {
  cashier: CashierWithStore;
  stores: Store[];
  currentStoreId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [kind, setKind] = useState<"permanent" | "temporary">("temporary");
  const [toStoreId, setToStoreId] = useState(
    stores.find((s) => s.id !== currentStoreId)?.id || ""
  );
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");

  const targetStores = stores.filter((s) => s.id !== cashier.store_id);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await createCashierStoreTransfer({
        cashierId: cashier.id,
        toStoreId,
        kind,
        startDate,
        endDate: kind === "temporary" ? endDate : null,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal onClose={onClose} size="md">
      <h3 className="text-lg font-semibold">Transférer un caissier</h3>
      <p className="mt-1 text-sm text-muted">
        {cashier.full_name || cashier.email} · magasin actuel : {cashier.store_name}
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium">Type de transfert</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["temporary", "Temporaire (dates)"],
                ["permanent", "Définitif"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setKind(value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm cursor-pointer",
                  kind === value
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface hover:border-primary/50"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <SelectMenu
          label="Magasin de destination"
          value={toStoreId}
          onChange={setToStoreId}
          options={targetStores.map((s) => ({
            value: s.id,
            label: s.name,
            description: s.city,
          }))}
        />

        <Input
          label="Date de début"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
          className="w-full"
        />

        {kind === "temporary" && (
          <Input
            label="Date de fin"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            min={startDate}
            className="w-full"
          />
        )}

        {kind === "permanent" && (
          <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
            Le magasin principal du caissier sera modifié immédiatement.
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={pending} disabled={!toStoreId}>
            <ArrowRightLeft className="h-4 w-4" />
            Confirmer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
