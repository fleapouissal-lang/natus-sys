"use client";

import { useRef, useState, useTransition, useEffect } from "react";
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
import { lookupLoyaltyCustomer, validatePosPromoCode, fetchLoyaltyCustomerNotes } from "@/lib/actions";
import { loyaltyLookupBlockedMessage } from "@/lib/loyalty/lookup-result";
import type { LoyaltyLookupResult } from "@/lib/loyalty/lookup-result";
import {
  maxRedeemablePoints,
  discountFromPoints,
  pointsEarnedForAmount,
  canRedeemLoyaltyPoints,
  pointsUntilRedemption,
} from "@/lib/loyalty/points";
import { looksLikePromoCode } from "@/lib/marketing/promo-input";
import { type AppliedPosPromo } from "@/lib/marketing/pos-promo";
import {
  computePosCheckoutDiscounts,
  isActiveProClient,
  PRO_CLIENT_DISCOUNT_LABEL,
  PRO_CLIENT_DISCOUNT_PERCENT,
} from "@/lib/pro-client/discount";
import { formatLoyaltyEarnRule, formatLoyaltyRedeemRule, pointsValueInMad } from "@/lib/loyalty/settings";
import { DEFAULT_LOYALTY_SETTINGS } from "@/lib/loyalty/config";
import { formatCurrency } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/loyalty/phone";
import type { LoyaltyCustomer, LoyaltySettings, CustomerNote } from "@/lib/types";
import { LoyaltyCustomerNotes } from "@/components/loyalty/loyalty-customer-notes";
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
  onLoyaltyLookupError,
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
  onLoyaltyLookupError?: (code: string, result: LoyaltyLookupResult) => void;
  loyaltySettings?: LoyaltySettings;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [qrCustomer, setQrCustomer] = useState<LoyaltyCustomer | null>(null);
  const [customerNotes, setCustomerNotes] = useState<CustomerNote[]>([]);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const scanBufferRef = useRef("");
  const lastScanKeyRef = useRef(0);

  const hasBenefits = Boolean(customer || promo);
  const activeProClient = isActiveProClient(customer);

  useEffect(() => {
    if (activeProClient && promo) {
      onPromoChange(null);
    }
  }, [activeProClient, promo, onPromoChange]);

  useEffect(() => {
    if (customer) {
      setHidden(true);
    }
  }, [customer?.id]);

  useEffect(() => {
    if (!customer) {
      setCustomerNotes([]);
      return;
    }

    void fetchLoyaltyCustomerNotes(customer.id).then((result) => {
      if ("notes" in result) {
        setCustomerNotes(result.notes);
      }
    });
  }, [customer?.id]);

  function applyCard(raw?: string) {
    const trimmed = (raw ?? input).trim();
    if (!trimmed || pending) return;

    setError("");
    startTransition(async () => {
      const result = await lookupLoyaltyCustomer(trimmed);
      if ("error" in result) {
        if (onLoyaltyLookupError) {
          onLoyaltyLookupError(trimmed, result);
        } else {
          setError(result.error === "Carte introuvable" ? "Carte introuvable" : result.error);
        }
        return;
      }
      if ("blocked" in result && result.blocked) {
        if (onLoyaltyLookupError) {
          onLoyaltyLookupError(trimmed, result);
        } else {
          setError(loyaltyLookupBlockedMessage(result.blocked));
        }
        return;
      }
      onCustomerChange(result.customer);
      onPointsToRedeemChange(0);
      setCustomerNotes(result.notes);
      setInput("");
      scanBufferRef.current = "";
      setHidden(true);
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
      setHidden(true);
    });
  }

  const loyaltyDiscount = discountFromPoints(pointsToRedeem, loyaltySettings);
  const { total: payable, proClientDiscount, promoDiscount } = computePosCheckoutDiscounts(
    subtotal,
    loyaltyDiscount,
    promo,
    customer
  );
  const maxRedeem = customer
    ? maxRedeemablePoints(customer.loyalty_points, subtotal, loyaltySettings)
    : 0;
  const redeemEligible = customer
    ? canRedeemLoyaltyPoints(customer.loyalty_points, loyaltySettings)
    : false;
  const pointsRemaining = customer
    ? pointsUntilRedemption(customer.loyalty_points, loyaltySettings)
    : 0;
  const pointsToEarn =
    customer && !activeProClient ? pointsEarnedForAmount(payable, loyaltySettings) : 0;

  if (hidden && hasBenefits) {
    return (
      <>
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-champagne/15 px-3 py-2 text-sm">
            <div className="min-w-0 flex-1 truncate text-foreground">
              {customer && activeProClient && (
                <span className="font-medium text-primary">
                  {customer.full_name.split(/\s+/)[0]} · {PRO_CLIENT_DISCOUNT_LABEL} (-
                  {PRO_CLIENT_DISCOUNT_PERCENT}%)
                  {proClientDiscount > 0 && (
                    <span className="text-muted"> · -{formatCurrency(proClientDiscount)}</span>
                  )}
                </span>
              )}
              {customer && !activeProClient && (
                <span className="font-medium">
                  {customer.full_name.split(/\s+/)[0]} · {customer.loyalty_points} pts
                  {redeemEligible && (
                    <span className="text-muted">
                      {" "}
                      (≈ {formatCurrency(pointsValueInMad(customer.loyalty_points, loyaltySettings))})
                    </span>
                  )}
                </span>
              )}
              {customer && !activeProClient && promo && (
                <span className="text-muted"> · </span>
              )}
              {promo && !activeProClient && (
                <span className="font-medium text-primary">
                  {promo.code} (-{formatCurrency(promoDiscount)})
                </span>
              )}
              {!customer && promo && !activeProClient && (
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

          {customer && !activeProClient && redeemEligible && maxRedeem > 0 && (
            <div className="rounded-lg border border-success/35 bg-success/5 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">Utiliser les points</p>
                  <p className="text-xs text-muted">
                    {formatLoyaltyRedeemRule(loyaltySettings)} · max {maxRedeem} pts sur ce panier
                  </p>
                </div>
                {pointsToRedeem > 0 && (
                  <p className="text-sm font-bold text-success">
                    -{formatCurrency(loyaltyDiscount)}
                  </p>
                )}
              </div>
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
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
                    placeholder={`${loyaltySettings.minPointsToRedeem} pts min`}
                    className="natus-field w-full bg-surface px-3 py-2 text-sm"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => onPointsToRedeemChange(maxRedeem)}
                >
                  Max
                </Button>
              </div>
            </div>
          )}

          {customer && !activeProClient && !redeemEligible && (
            <p className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">
              Paiement avec points dès {loyaltySettings.minPointsToRedeem} pts — encore{" "}
              <span className="font-semibold text-primary">{pointsRemaining} pts</span>.
            </p>
          )}
        </div>

        {showCreate && (
          <CreateLoyaltyCustomerModal
            onClose={() => setShowCreate(false)}
            onCreated={(c) => {
              onCustomerChange(c);
              onPointsToRedeemChange(0);
              setShowCreate(false);
              setQrCustomer(c);
              setHidden(true);
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

        {promo && !activeProClient && (
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
                  setCustomerNotes([]);
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
              {activeProClient ? (
                <span className="font-semibold text-primary">
                  -{PRO_CLIENT_DISCOUNT_PERCENT}% Client Pro
                </span>
              ) : (
                <span className="font-semibold text-success">+{pointsToEarn} pts</span>
              )}
            </div>

            {activeProClient && proClientDiscount > 0 && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                <p className="font-semibold text-primary">{PRO_CLIENT_DISCOUNT_LABEL}</p>
                <p className="text-xs text-muted">
                  Remise automatique de {PRO_CLIENT_DISCOUNT_PERCENT}% sur le panier
                  {proClientDiscount > 0 && (
                    <span className="font-medium text-foreground">
                      {" "}
                      · -{formatCurrency(proClientDiscount)}
                    </span>
                  )}
                </p>
              </div>
            )}

            <LoyaltyCustomerNotes notes={customerNotes} compact />

            {!activeProClient && redeemEligible && maxRedeem > 0 && (
              <div className="rounded-lg border border-success/35 bg-success/5 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Convertir les points en réduction
                    </p>
                    <p className="text-xs text-muted">
                      {formatLoyaltyRedeemRule(loyaltySettings)} · max {maxRedeem} pts
                    </p>
                  </div>
                  {pointsToRedeem > 0 && (
                    <p className="text-sm font-bold text-success">
                      -{formatCurrency(loyaltyDiscount)}
                    </p>
                  )}
                </div>
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-xs font-medium">Points à utiliser</label>
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
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="mb-0.5"
                    onClick={() => onPointsToRedeemChange(maxRedeem)}
                  >
                    Max
                  </Button>
                </div>
              </div>
            )}

            {!activeProClient && !redeemEligible && (
              <p className="text-xs text-muted">
                {loyaltySettings.minPointsToRedeem} pts min — encore {pointsRemaining} pts
              </p>
            )}

            {!promo && !activeProClient && (
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
            setHidden(true);
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
