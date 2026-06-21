"use client";

import { useState, useTransition } from "react";
import { Phone, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { SelectMenu } from "@/components/ui/select-menu";
import { updateShopifyOrderConfirmationFollowUp } from "@/lib/actions";
import { cashierConfirmationStatusOptions } from "@/lib/select-options";
import {
  CASHIER_CONFIRMATION_STATUS_LABELS,
  type CashierConfirmationStatus,
  isConfirmationCallOverdue,
} from "@/lib/shopify/confirmation-follow-up";
import type { ShopifyOrder } from "@/lib/types";

function phoneTelHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("212")) return `tel:+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `tel:+212${digits.slice(1)}`;
  return `tel:${phone}`;
}

export function ConfirmationFollowUpModal({
  order,
  onClose,
  onSaved,
}: {
  order: ShopifyOrder;
  onClose: () => void;
  onSaved: (patch: Partial<ShopifyOrder>) => void;
}) {
  const [status, setStatus] = useState<CashierConfirmationStatus>(
    order.cashier_confirmation_status || "no_response"
  );
  const [note, setNote] = useState(order.cashier_confirmation_note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const overdue = isConfirmationCallOverdue(order);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await updateShopifyOrderConfirmationFollowUp(
        order.id,
        status,
        note
      );

      if ("error" in result) {
        setError(result.error);
        return;
      }

      const now = new Date().toISOString();
      onSaved({
        cashier_confirmation_status: status,
        cashier_confirmation_note:
          status === "confirmed" ? null : note.trim() || null,
        cashier_confirmation_at: now,
      });
      onClose();
    });
  }

  return (
    <Modal onClose={onClose} size="sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Suivi confirmation client</h3>
          <p className="mt-1 text-sm text-muted">{order.order_number}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 cursor-pointer text-muted hover:text-foreground"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {overdue && (
        <div className="mb-4 border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          Plus de 4 h sans confirmation WhatsApp — appelez le client.
        </div>
      )}

      {order.customer_phone && status !== "confirmed" && (
        <a
          href={phoneTelHref(order.customer_phone)}
          className="mb-4 inline-flex items-center gap-2 border border-primary/30 bg-champagne px-3 py-2 text-sm font-medium text-black hover:brightness-95"
        >
          <Phone className="h-4 w-4" />
          Appeler {order.customer_phone}
        </a>
      )}

      <label className="block text-sm font-medium text-foreground">
        Résultat de l&apos;appel
        <SelectMenu
          value={status}
          onChange={(value) => setStatus(value as CashierConfirmationStatus)}
          options={cashierConfirmationStatusOptions()}
          className="mt-1.5 w-full"
          size="sm"
        />
      </label>
      <p className="mt-1 text-xs text-muted">
        {CASHIER_CONFIRMATION_STATUS_LABELS[status]}
      </p>

      {status !== "confirmed" && (
        <label className="mt-4 block text-sm font-medium text-foreground">
          Note caisse
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="Ex. 3 appels sans réponse, client rappellera demain…"
            className="natus-field mt-1.5 w-full resize-y bg-surface px-3 py-2 text-sm"
            autoFocus
          />
        </label>
      )}
      {status !== "confirmed" && (
        <p className="mt-1 text-xs text-muted">{note.trim().length}/500</p>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
          Annuler
        </Button>
        <Button type="button" onClick={handleSubmit} loading={pending}>
          Enregistrer
        </Button>
      </div>
    </Modal>
  );
}
