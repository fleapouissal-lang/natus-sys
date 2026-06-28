"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoyaltyWalletCard } from "@/components/loyalty/loyalty-wallet-card";
import { customerCardUrl } from "@/lib/loyalty/qr";
import type { LoyaltyCustomer } from "@/lib/types";

export function LoyaltyCardShareForCashier({
  customer,
  onClose,
}: {
  customer: LoyaltyCustomer;
  onClose?: () => void;
}) {
  const cardUrl = customerCardUrl(customer.qr_token, Boolean(customer.is_pro_client));
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(cardUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-muted">
        Montrez la carte au client — il peut scanner le code-barres en caisse ou ouvrir son
        espace client sur son téléphone.
      </p>
      <LoyaltyWalletCard customer={customer} compact />
      <p className="break-all px-2 text-center text-xs text-muted">{cardUrl}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="secondary" onClick={() => void copyLink()}>
          {copied ? "Lien copié" : "Copier le lien"}
        </Button>
        <a
          href={cardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Ouvrir sur téléphone
        </a>
        {onClose && (
          <Button type="button" variant="secondary" onClick={onClose}>
            Fermer
          </Button>
        )}
      </div>
    </div>
  );
}

/** @deprecated use LoyaltyCardShareForCashier */
export const LoyaltyCardQrForCashier = LoyaltyCardShareForCashier;
