"use client";

import { useState, useTransition } from "react";
import { ScanLine, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { lookupLoyaltyCustomer } from "@/lib/actions";
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
import { useBarcodeScanner } from "@/lib/hooks/use-barcode-scanner";
import { cn } from "@/lib/utils";

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
  const [lookupInput, setLookupInput] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [qrCustomer, setQrCustomer] = useState<LoyaltyCustomer | null>(null);
  const [scannerFocused, setScannerFocused] = useState(false);

  function runLookup(value: string) {
    const trimmed = value.trim();
    if (!trimmed || pending) return;

    setError("");
    startTransition(async () => {
      const result = await lookupLoyaltyCustomer(trimmed);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onCustomerChange(result.customer);
      onPointsToRedeemChange(0);
      setLookupInput("");
    });
  }

  const { inputRef, handleKeyDown, handleChange } = useBarcodeScanner({
    onScan: runLookup,
    enabled: !customer,
    autoRefocus: false,
  });

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleChange(e);
    setLookupInput(e.target.value);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    handleKeyDown(e);
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
              <LoyaltyWalletCard customer={customer} compact />
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
              <div
                className={cn(
                  "relative flex-1 rounded-lg border transition-colors",
                  scannerFocused ? "border-primary" : "border-transparent"
                )}
              >
                <ScanLine
                  className={cn(
                    "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
                    scannerFocused ? "text-primary" : "text-muted"
                  )}
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={lookupInput}
                  onChange={handleInputChange}
                  onKeyDown={handleInputKeyDown}
                  onFocus={() => setScannerFocused(true)}
                  onBlur={() => setScannerFocused(false)}
                  placeholder="Téléphone, code-barres ou QR code"
                  autoComplete="off"
                  className="natus-field w-full bg-surface py-2 pl-10 pr-3 text-sm font-mono placeholder:font-sans"
                />
              </div>
              <Button
                type="button"
                size="sm"
                disabled={pending || !lookupInput.trim()}
                onClick={() => runLookup(lookupInput)}
              >
                Chercher
              </Button>
            </div>
            <p className="text-xs text-muted">
              Saisissez le numéro de téléphone, scannez le code-barres au verso de la carte ou le QR
              code.
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
