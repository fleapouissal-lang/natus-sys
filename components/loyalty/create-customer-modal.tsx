"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { LoyaltyWalletCard } from "@/components/loyalty/loyalty-wallet-card";
import { createLoyaltyCustomer } from "@/lib/actions";
import { LOYALTY_CARD_VARIANTS } from "@/lib/loyalty/card-variant";
import { cn } from "@/lib/utils";
import type { LoyaltyCardVariant, LoyaltyCustomer } from "@/lib/types";

function previewCustomer(
  fullName: string,
  cardVariant: LoyaltyCardVariant
): LoyaltyCustomer {
  const now = new Date().toISOString();
  return {
    id: "preview",
    full_name: fullName.trim() || "Nouveau client",
    phone: "+212600000000",
    email: null,
    card_number: "FID-284719",
    loyalty_points: 1,
    qr_token: "00000000-0000-0000-0000-000000000000",
    store_id: null,
    card_variant: cardVariant,
    apple_wallet_pass_id: null,
    google_wallet_pass_id: null,
    created_at: now,
    updated_at: now,
  };
}

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
  const [cardVariant, setCardVariant] = useState<LoyaltyCardVariant>("champagne");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const preview = useMemo(
    () => previewCustomer(fullName, cardVariant),
    [fullName, cardVariant]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await createLoyaltyCustomer({
        fullName,
        phone,
        email: email || undefined,
        storeId,
        cardVariant,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onCreated(result.customer);
    });
  }

  return (
    <Modal onClose={onClose} size="lg">
      <h3 className="text-lg font-semibold">Nouveau client fidélité</h3>
      <p className="mt-1 text-sm text-muted">
        Choisissez le modèle de carte, puis renseignez les informations du client.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium">Modèle de carte</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {LOYALTY_CARD_VARIANTS.map((option) => {
              const selected = cardVariant === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setCardVariant(option.id);
                    setError("");
                  }}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left transition-colors cursor-pointer",
                    selected
                      ? "border-primary bg-primary-light/30"
                      : "border-border bg-surface hover:bg-primary-light/15"
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">{option.label}</p>
                  <p className="mt-0.5 text-xs text-muted">{option.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-page/60 p-3">
          <p className="mb-2 text-center text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Aperçu
          </p>
          <LoyaltyWalletCard
            customer={preview}
            compact
            flipable
            showBarcode={cardVariant === "noir" || cardVariant === "champagne" || cardVariant === "creme"}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
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
