"use client";

import { useState, useTransition } from "react";
import { Search, UserPlus, X, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  lookupLoyaltyCustomerByPhone,
} from "@/lib/actions";
import {
  maxRedeemablePoints,
  discountFromPoints,
  pointsEarnedForAmount,
  payableAfterRedemption,
} from "@/lib/loyalty/points";
import { formatCurrency } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/loyalty/phone";
import type { LoyaltyCustomer } from "@/lib/types";
import { CreateLoyaltyCustomerModal } from "@/components/loyalty/create-customer-modal";
import { LoyaltyCardQrForCashier } from "@/components/loyalty/loyalty-card-client-view";
import { LoyaltyWalletCard } from "@/components/loyalty/loyalty-wallet-card";
import { Modal } from "@/components/ui/modal";

export function PosLoyaltyPanel({
  subtotal,
  customer,
  pointsToRedeem,
  onCustomerChange,
  onPointsToRedeemChange,
}: {
  subtotal: number;
  customer: LoyaltyCustomer | null;
  pointsToRedeem: number;
  onCustomerChange: (customer: LoyaltyCustomer | null) => void;
  onPointsToRedeemChange: (points: number) => void;
}) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [qrCustomer, setQrCustomer] = useState<LoyaltyCustomer | null>(null);

  function handleSearch() {
    setError("");
    startTransition(async () => {
      const result = await lookupLoyaltyCustomerByPhone(phone);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onCustomerChange(result.customer);
      onPointsToRedeemChange(0);
      setPhone("");
    });
  }

  const maxRedeem = customer ? maxRedeemablePoints(customer.loyalty_points, subtotal) : 0;
  const discount = discountFromPoints(pointsToRedeem);
  const payable = payableAfterRedemption(subtotal, pointsToRedeem);
  const pointsToEarn = customer ? pointsEarnedForAmount(payable) : 0;

  return (
    <>
      <Card className="!p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Carte fidélité</p>
          {!customer && (
            <Button type="button" size="sm" variant="secondary" onClick={() => setShowCreate(true)}>
              <UserPlus className="h-4 w-4" />
              Nouveau client
            </Button>
          )}
        </div>

        {customer ? (
          <div className="space-y-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  onCustomerChange(null);
                  onPointsToRedeemChange(0);
                }}
                className="absolute right-2 top-2 z-10 rounded-full bg-black/50 p-1 text-[#EBD4BA] hover:bg-black/70 cursor-pointer"
                aria-label="Retirer le client"
              >
                <X className="h-4 w-4" />
              </button>
              <LoyaltyWalletCard customer={customer} compact flipable={false} />
            </div>

            <div className="rounded-lg bg-primary-light/20 px-3 py-2 text-sm">
              <p className="font-medium text-foreground">{customer.full_name}</p>
              <p className="text-muted">{formatPhoneDisplay(customer.phone)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border bg-surface px-3 py-2">
                <p className="text-muted">Solde</p>
                <p className="text-lg font-bold text-primary">{customer.loyalty_points} pts</p>
              </div>
              <div className="rounded-lg border border-border bg-surface px-3 py-2">
                <p className="text-muted">Gain estimé</p>
                <p className="text-lg font-bold text-success">+{pointsToEarn} pts</p>
              </div>
            </div>

            {maxRedeem > 0 && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Utiliser des points (max {maxRedeem})
                </label>
                <input
                  type="number"
                  min={0}
                  max={maxRedeem}
                  value={pointsToRedeem || ""}
                  onChange={(e) =>
                    onPointsToRedeemChange(
                      Math.min(maxRedeem, Math.max(0, Number(e.target.value) || 0))
                    )
                  }
                  className="natus-field w-full bg-surface px-3 py-2 text-sm"
                />
                {pointsToRedeem > 0 && (
                  <p className="mt-1 text-xs text-muted">
                    Réduction : {formatCurrency(discount)}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Téléphone client"
                  className="natus-field w-full bg-surface py-2 pl-10 pr-3 text-sm"
                />
              </div>
              <Button type="button" size="sm" disabled={pending || !phone.trim()} onClick={handleSearch}>
                Chercher
              </Button>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <ScanLine className="h-3.5 w-3.5" />
              Scannez le code-barres de la carte fidélité
            </p>
          </div>
        )}

        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </Card>

      {showCreate && (
        <CreateLoyaltyCustomerModal
          onClose={() => setShowCreate(false)}
          onCreated={(c) => {
            onCustomerChange(c);
            onPointsToRedeemChange(0);
            setShowCreate(false);
            setQrCustomer(c);
          }}
        />
      )}

      {qrCustomer && (
        <Modal onClose={() => setQrCustomer(null)} size="md">
          <h3 className="mb-2 text-center text-lg font-semibold">Carte créée — à montrer au client</h3>
          <LoyaltyCardQrForCashier customer={qrCustomer} onClose={() => setQrCustomer(null)} />
        </Modal>
      )}
    </>
  );
}
