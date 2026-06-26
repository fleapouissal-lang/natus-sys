"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createPlanningCashier,
  deactivatePlanningCashier,
} from "@/lib/actions";
import type { PlanningCashier } from "@/lib/scheduling/planning-cashiers";

type Props = {
  storeId: string;
  storeName: string;
  cashiers: PlanningCashier[];
};

export function PlanningCashierRoster({ storeId, storeName, cashiers }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await createPlanningCashier({ storeId, fullName: name });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setName("");
      router.refresh();
    });
  }

  function handleRemove(cashierId: string, fullName: string | null) {
    if (!confirm(`Retirer « ${fullName || "ce caissier"} » du planning ?`)) return;
    setError("");
    startTransition(async () => {
      const result = await deactivatePlanningCashier(cashierId);
      if ("error" in result) setError(result.error);
      else router.refresh();
    });
  }

  if (!storeId) {
    return (
      <Card className="py-8 text-center text-sm text-muted">
        Sélectionnez un magasin pour gérer la liste des caissiers.
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-4 md:p-5">
      <div>
        <h2 className="font-heading text-base font-semibold">Caissiers du magasin</h2>
        <p className="mt-1 text-sm text-muted">
          Noms utilisés uniquement pour le planning de {storeName} — sans compte de connexion.
        </p>
      </div>

      {cashiers.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
          Aucun caissier. Ajoutez un nom pour commencer le planning.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {cashiers.map((cashier) => (
            <li
              key={cashier.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <UserRound className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate font-medium">{cashier.full_name}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 text-danger hover:text-danger"
                disabled={pending}
                onClick={() => handleRemove(cashier.id, cashier.full_name)}
              >
                <Trash2 className="h-4 w-4" />
                Retirer
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Input
          label="Nouveau caissier"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex. Fatima, Youssef…"
          className="flex-1"
          required
        />
        <Button type="submit" loading={pending} disabled={!name.trim()}>
          <Plus className="h-4 w-4" />
          Ajouter
        </Button>
      </form>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}
    </Card>
  );
}
