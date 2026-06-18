"use client";

import { useRef, useState, useTransition } from "react";
import {
  ChevronDown,
  ChevronUp,
  CreditCard,
  ScanLine,
  Tag,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { lookupLoyaltyCustomer, validatePosPromoCode } from "@/lib/actions";
import {
  maxRedeemablePoints,
  discountFromPoints,
  pointsEarnedForAmount,
  canRedeemLoyaltyPoints,
  pointsUntilRedemption,
} from "@/lib/loyalty/points";
import { looksLikePromoCode } from "@/lib/marketing/promo-input";
import {
  checkoutTotal,
  promoDiscountAmount,
  type AppliedPosPromo,
} from "@/lib/marketing/pos-promo";
import { formatLoyaltyEarnRule, formatLoyaltyRedeemRule } from "@/lib/loyalty/settings";
import { DEFAULT_LOYALTY_SETTINGS } from "@/lib/loyalty/config";
import { formatCurrency } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/loyalty/phone";
import type { LoyaltyCustomer, LoyaltySettings } from "@/lib/types";
import { CreateLoyaltyCustomerModal } from "@/components/loyalty/create-customer-modal";
import { LoyaltyCardQrForCashier } from "@/components/loyalty/loyalty-card-client-view";
import { LoyaltyWalletCard } from "@/components/loyalty/loyalty-wallet-card";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import {
  charFromScannerKeyCode,
  isScannerKeyBurst,
} from "@/lib/barcode/scanner-key";

export function PosCheckoutPanel({
  subtotal,
  storeId,
  customer,
  pointsToRedeem,
  promo,
  onCustomerChange,
  onPointsToRedeemChange,
  onPromoChange,
  loyaltySettings = DEFAULT_LOYALTY_SETTINGS,
}: {
  subtotal: number;
  storeId?: string;
  customer: LoyaltyCustomer | null;
  pointsToRedeem: number;
  promo: AppliedPosPromo | null;
  onCustomerChange: (customer: LoyaltyCustomer | null) => void;
  onPointsToRedeemChange: (points: number) => void;
  onPromoChange: (promo: AppliedPosPromo | null) => void;
  loyaltySettings?: LoyaltySettings;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [qrCustomer, setQrCustomer] = useState<LoyaltyCustomer | null>(null);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const scanBufferRef = useRef("");
  const lastScanKeyRef = useRef(0);

  const hasBenefits = Boolean(customer || promo);

  function applyCard(raw?: string) {
    const trimmed = (raw ?? input).trim();
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
      setInput("");
      scanBufferRef.current = "";
      setHidden(false);
    });
  }

  function applyPromo(raw?: string) {
    const trimmed = (raw ?? input).trim();
    if (!trimmed || pending) return;

    setError("");
    startTransition(async () => {
      const result = await validatePosPromoCode(trimmed, storeId, customer?.id);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onPromoChange(result.promo);
      setInput("");
      scanBufferRef.current = "";
    });
  }

  const loyaltyDiscount = discountFromPoints(pointsToRedeem, loyaltySettings);
  const afterLoyalty = Math.max(0, subtotal - loyaltyDiscount);
  const promoDiscount = promo
    ? promoDiscountAmount(afterLoyalty, promo.discountPercent)
    : 0;
  const payable = checkoutTotal(subtotal, loyaltyDiscount, promo);
  const maxRedeem = customer
    ? maxRedeemablePoints(customer.loyalty_points, subtotal, loyaltySettings)
    : 0;
  const redeemEligible = customer
    ? canRedeemLoyaltyPoints(customer.loyalty_points, loyaltySettings)
    : false;
  const pointsRemaining = customer
    ? pointsUntilRedemption(customer.loyalty_points, loyaltySettings)
    : 0;
  const pointsToEarn = customer ? pointsEarnedForAmount(payable, loyaltySettings) : 0;

  if (hidden && hasBenefits) {
    return (
      <>
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-champagne/15 px-3 py-2 text-sm">
          <div className="min-w-0 flex-1 truncate text-foreground">
            {customer && (
              <span className="font-medium">
                {customer.full_name.split(/\s+/)[0]} · {customer.loyalty_points} pts
              </span>
            )}
            {customer && promo && <span className="text-muted"> · </span>}
            {promo && (
              <span className="font-medium text-primary">
                {promo.code} (-{formatCurrency(promoDiscount)})
              </span>
            )}
            {!customer && promo && (
              <span className="text-muted">{promo.label}</span>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setHidden(false)}
            className="shrink-0 gap-1"
          >
            <ChevronDown className="h-4 w-4" />
            Afficher
          </Button>
        </div>

        {showCreate && (
          <CreateLoyaltyCustomerModal
            onClose={() => setShowCreate(false)}
            onCreated={(c) => {
              onCustomerChange(c);
              onPointsToRedeemChange(0);
              setShowCreate(false);
              setQrCustomer(c);
              setHidden(false);
            }}
          />
        )}

        {qrCustomer && (
          <Modal onClose={() => setQrCustomer(null)} size="md">
            <h3 className="mb-2 text-center text-lg font-semibold">
              Carte créée — à montrer au client
            </h3>
            <LoyaltyCardQrForCashier customer={qrCustomer} onClose={() => setQrCustomer(null)} />
          </Modal>
        )}
      </>
    );
  }

  return (
    <>
      <Card className="!p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Carte & promo</p>
          {hasBenefits && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setHidden(true)}
              className="gap-1"
            >
              <ChevronUp className="h-4 w-4" />
              Masquer
            </Button>
          )}
        </div>

        {!customer && (
          <>
            <div
              className={cn(
                "relative rounded-lg border transition-colors",
                focused ? "border-primary" : "border-border"
              )}
            >
              <ScanLine
                className={cn(
                  "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
                  focused ? "text-primary" : "text-muted"
                )}
              />
              <input
                type="text"
                value={input}
                onChange={(e) => {
                  scanBufferRef.current = "";
                  setInput(e.target.value);
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => {
                  const isScanner = isScannerKeyBurst(lastScanKeyRef.current);
                  lastScanKeyRef.current = Date.now();

                  if (e.key === "Enter") {
                    e.preventDefault();
                    const code = scanBufferRef.current.trim() || input.trim();
                    scanBufferRef.current = "";
                    if (code) setInput(code);
                    if (looksLikePromoCode(code)) {
                      applyPromo(code);
                    } else {
                      applyCard(code);
                    }
                    return;
                  }

                  if (
                    isScanner &&
                    e.key.length === 1 &&
                    !e.ctrlKey &&
                    !e.metaKey &&
                    !e.altKey
                  ) {
                    const ch = charFromScannerKeyCode(e);
                    if (ch) {
                      e.preventDefault();
                      scanBufferRef.current += ch;
                      setInput(scanBufferRef.current);
                    }
                  } else if (!isScanner) {
                    scanBufferRef.current = "";
                  }
                }}
                placeholder="Téléphone, carte, QR ou code promo"
                autoComplete="off"
                className="natus-field w-full bg-surface py-2 pl-10 pr-3 text-sm font-mono placeholder:font-sans"
              />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={pending || !input.trim()}
                onClick={() => applyCard()}
                className="justify-center gap-1.5"
              >
                <CreditCard className="h-4 w-4" />
                Carte
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={pending || !input.trim()}
                onClick={() => applyPromo()}
                className="justify-center gap-1.5"
              >
                <Tag className="h-4 w-4" />
                Promo
              </Button>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-xs text-muted">
                {formatLoyaltyEarnRule(loyaltySettings)} · {formatLoyaltyRedeemRule(loyaltySettings)}
              </p>
              <Button type="button" size="sm" variant="secondary" onClick={() => setShowCreate(true)}>
                <UserPlus className="h-4 w-4" />
                Nouveau
              </Button>
            </div>
          </>
        )}

        {promo && (
          <div
            className={cn(
              "flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-champagne/20 px-3 py-2 text-sm",
              customer ? "mt-2" : "mt-0"
            )}
          >
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{promo.code}</p>
              <p className="text-xs text-muted">
                {promo.label} · -{formatCurrency(promoDiscount)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onPromoChange(null)}
              className="shrink-0 rounded-full p-1 text-muted hover:bg-surface hover:text-danger cursor-pointer"
              aria-label="Retirer le code promo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {customer && (
          <div className="mt-2 space-y-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  onCustomerChange(null);
                  onPointsToRedeemChange(0);
                  setHidden(false);
                }}
                className="absolute right-2 top-2 z-10 rounded-full bg-black/50 p-1 text-[#EBD4BA] hover:bg-black/70 cursor-pointer"
                aria-label="Retirer le client"
              >
                <X className="h-4 w-4" />
              </button>
              <LoyaltyWalletCard customer={customer} compact />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span>{formatPhoneDisplay(customer.phone)}</span>
              <span className="font-semibold text-success">+{pointsToEarn} pts</span>
            </div>

            {redeemEligible && maxRedeem > 0 && (
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-xs font-medium">
                    Points (max {maxRedeem})
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
                    className="natus-field w-full bg-surface px-3 py-1.5 text-sm"
                  />
                </div>
                {pointsToRedeem > 0 && (
                  <p className="shrink-0 pb-2 text-xs text-success">
                    -{formatCurrency(loyaltyDiscount)}
                  </p>
                )}
              </div>
            )}

            {!redeemEligible && (
              <p className="text-xs text-muted">
                {loyaltySettings.minPointsToRedeem} pts min — encore {pointsRemaining} pts
              </p>
            )}

            {!promo && (
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyPromo();
                    }
                  }}
                  placeholder="Code promo"
                  autoComplete="off"
                  className="natus-field min-w-0 flex-1 bg-surface px-3 py-1.5 text-sm font-mono"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={pending || !input.trim()}
                  onClick={() => applyPromo()}
                >
                  Promo
                </Button>
              </div>
            )}
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
            setHidden(false);
          }}
        />
      )}

      {qrCustomer && (
        <Modal onClose={() => setQrCustomer(null)} size="md">
          <h3 className="mb-2 text-center text-lg font-semibold">
            Carte créée — à montrer au client
          </h3>
          <LoyaltyCardQrForCashier customer={qrCustomer} onClose={() => setQrCustomer(null)} />
        </Modal>
      )}
    </>
  );
}
