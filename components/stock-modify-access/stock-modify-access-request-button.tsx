"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { CardHeader } from "@/components/ui/card";
import { createStockModifyAccessRequest } from "@/lib/stock-modify-access/actions";
import { toLocalDateKey } from "@/lib/utils";
import type { StockModifyAccessRequest } from "@/lib/stock-modify-access/types";
import { isAccessRequestActive } from "@/lib/stock-modify-access/utils";

export function StockModifyAccessRequestButton({
  role,
  stores = [],
  hubStoreLabel,
  myRequests = [],
}: {
  role: "manager" | "hub";
  stores?: { id: string; name: string; city: string }[];
  hubStoreLabel?: string;
  myRequests?: StockModifyAccessRequest[];
}) {
  const router = useRouter();
  const today = toLocalDateKey(new Date());
  const [open, setOpen] = useState(false);
  const [validFrom, setValidFrom] = useState(today);
  const [validTo, setValidTo] = useState(today);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>(
    stores.length === 1 ? [stores[0].id] : []
  );
  const [requestNote, setRequestNote] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const activeGrant = myRequests.find(isAccessRequestActive);
  const pendingRequest = myRequests.find((r) => r.status === "pending");

  function toggleStore(storeId: string) {
    setSelectedStoreIds((current) =>
      current.includes(storeId)
        ? current.filter((id) => id !== storeId)
        : [...current, storeId]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      setError("");
      const result = await createStockModifyAccessRequest({
        validFrom,
        validTo,
        storeIds: role === "manager" ? selectedStoreIds : undefined,
        requestNote,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {activeGrant && (
          <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">
            Accès actif jusqu&apos;au {activeGrant.valid_to}
          </span>
        )}
        {pendingRequest && !activeGrant && (
          <span className="rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
            Demande en attente
          </span>
        )}
        <Button type="button" size="sm" variant="secondary" className="gap-2" onClick={() => setOpen(true)}>
          <KeyRound className="h-4 w-4" />
          Demander accès modification
        </Button>
      </div>

      {open && (
        <Modal onClose={() => setOpen(false)} size="md">
          <CardHeader
            title="Demande d'accès modification stock"
            description={
              role === "hub"
                ? `Entrepôt : ${hubStoreLabel || "votre dépôt"}`
                : "Sélectionnez un ou plusieurs magasins"
            }
            action={
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted hover:text-foreground"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            }
          />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Du"
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                required
              />
              <Input
                label="Au"
                type="date"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                required
              />
            </div>

            {role === "manager" && (
              <div>
                <p className="mb-2 text-sm font-medium">Magasins concernés</p>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                  {stores.map((store) => (
                    <label key={store.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedStoreIds.includes(store.id)}
                        onChange={() => toggleStore(store.id)}
                        className="rounded border-border"
                      />
                      <span>
                        {store.name} — {store.city}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Input
              label="Motif (optionnel)"
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              placeholder="Inventaire, réception exceptionnelle…"
            />

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button type="submit" loading={pending} className="w-full">
              Envoyer au directeur
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
