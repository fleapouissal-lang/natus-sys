"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { createLoyaltyCustomer } from "@/lib/actions";
import type { LoyaltyCustomer } from "@/lib/types";

export function CreateLoyaltyCustomerModal({
  onClose,
  onCreated,
  storeId,
}: {
  onClose: () => void;
  onCreated: (customer: LoyaltyCustomer) => void;
  storeId?: string;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await createLoyaltyCustomer({
        fullName,
        phone,
        email: email || undefined,
        storeId,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onCreated(result.customer);
    });
  }

  return (
    <Modal onClose={onClose} size="md">
      <h3 className="text-lg font-semibold">Nouveau client fidélité</h3>
      <p className="mt-1 text-sm text-muted">
        Une carte numérique FID-XXXXXX et un code-barres seront générés automatiquement.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Nom complet</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="natus-field w-full bg-surface px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Téléphone</label>
          <input
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="06 XX XX XX XX"
            className="natus-field w-full bg-surface px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Email (optionnel)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="natus-field w-full bg-surface px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Création…" : "Créer la carte"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
