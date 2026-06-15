"use client";

import { useState, useTransition } from "react";
import { RotateCcw, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  markShopifyOrderReturned,
  updateShopifyOrderReturnNote,
} from "@/lib/actions";
import type { ShopifyOrder } from "@/lib/types";

export function ReturnNoteModal({
  order,
  mode,
  onClose,
  onSaved,
}: {
  order: ShopifyOrder;
  mode: "create" | "edit";
  onClose: () => void;
  onSaved: (note: string) => void;
}) {
  const [note, setNote] = useState(order.return_note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result =
        mode === "create"
          ? await markShopifyOrderReturned(order.id, note)
          : await updateShopifyOrderReturnNote(order.id, note);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      onSaved(note.trim());
      onClose();
    });
  }

  return (
    <Modal onClose={onClose} size="sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">
            {mode === "create" ? "Retour — note obligatoire" : "Modifier la note de retour"}
          </h3>
          <p className="mt-1 text-sm text-muted">{order.order_number}</p>
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

      {mode === "create" && (
        <p className="mb-3 text-sm text-muted">
          Indiquez la raison du retour (client absent, refus, adresse incorrecte…).
        </p>
      )}

      {mode === "edit" && (
        <p className="mb-3 text-sm text-muted">
          Modifiable pendant 2 h après le retour.
        </p>
      )}

      <label className="block text-sm font-medium text-foreground">
        Note de retour
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          maxLength={500}
          placeholder="Ex. client absent, colis refusé…"
          className="natus-field mt-1.5 w-full resize-y bg-surface px-3 py-2 text-sm"
          autoFocus
        />
      </label>
      <p className="mt-1 text-xs text-muted">{note.trim().length}/500</p>

      {error && (
        <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
          Annuler
        </Button>
        <Button type="button" onClick={handleSubmit} loading={pending}>
          <RotateCcw className="h-4 w-4" />
          {mode === "create" ? "Confirmer le retour" : "Enregistrer"}
        </Button>
      </div>
    </Modal>
  );
}
