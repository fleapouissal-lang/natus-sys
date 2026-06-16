"use client";

import { cn } from "@/lib/utils";
import { loyaltyTierFromPoints, loyaltyTierLabel } from "@/lib/loyalty/tiers";
import {
  formatLoyaltyCardNumber,
  formatLoyaltyCardExpiry,
} from "@/lib/loyalty/card-display";
import { LoyaltyCardBarcode } from "@/components/loyalty/loyalty-card-barcode";
import { LoyaltyContactlessIcon } from "@/components/loyalty/loyalty-card-icons";
import { LoyaltyCardFlipShell } from "@/components/loyalty/loyalty-card-flip-shell";
import { LoyaltyWalletCardNoir } from "@/components/loyalty/loyalty-wallet-card-noir";
import { LoyaltyWalletCardCreme } from "@/components/loyalty/loyalty-wallet-card-creme";
import { resolveLoyaltyCardVariant } from "@/lib/loyalty/card-variant";
import type { LoyaltyCardVariant, LoyaltyCustomer } from "@/lib/types";

/** Palette référence carte champagne */
const IVORY = "#F9F7F2";
const CHAMPAGNE = "#D8C9B9";
const BRONZE = "#4A443F";
const METAL_GOLD = "#C5B399";
const METAL_BRONZE = "#A88958";
const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS = "var(--font-jost), system-ui, sans-serif";

const CARD_GRADIENT = `radial-gradient(ellipse 90% 85% at 50% 38%, ${IVORY} 0%, ${CHAMPAGNE} 100%)`;
const GOLD_BAND = `linear-gradient(180deg, ${METAL_GOLD} 0%, ${METAL_BRONZE} 100%)`;

function ChampagneCardFace({
  children,
  flipped = false,
}: {
  children: React.ReactNode;
  flipped?: boolean;
}) {
  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{
        background: CARD_GRADIENT,
        backfaceVisibility: "hidden",
        transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        color: BRONZE,
      }}
    >
      {children}
    </div>
  );
}

function CustomerPointsBadge({
  points,
  compact,
}: {
  points: number;
  compact: boolean;
}) {
  const size = compact ? 26 : 30;
  const display = points > 99 ? "99+" : String(points);
  const fontSize =
    display.length >= 3
      ? compact
        ? 7
        : 8
      : display.length === 2
        ? compact
          ? 8
          : 9
        : compact
          ? 9
          : 10;

  return (
    <div
      className="loyalty-wallet-card-round absolute right-0 top-0 flex items-center justify-center border tabular-nums"
      style={{
        width: size,
        height: size,
        borderColor: "rgba(74,68,63,0.3)",
        background: "rgba(255,255,255,0.45)",
        fontFamily: SERIF,
        fontSize,
        fontWeight: 700,
        lineHeight: 1,
      }}
      title={`${points} points`}
      aria-label={`${points} points de fidélité`}
    >
      {display}
    </div>
  );
}

function BrandCircles({ compact }: { compact: boolean }) {
  const size = compact ? 22 : 26;
  return (
    <div className="flex items-center" style={{ height: size }}>
      <div
        className="loyalty-wallet-card-round border"
        style={{
          width: size,
          height: size,
          background: "#FFFFFF",
          borderColor: "rgba(74,68,63,0.25)",
        }}
      />
      <div
        className="loyalty-wallet-card-round -ml-2.5"
        style={{
          width: size,
          height: size,
          background: `linear-gradient(135deg, ${METAL_GOLD}, ${METAL_BRONZE})`,
        }}
      />
    </div>
  );
}

function LoyaltyCardFront({
  customer,
  compact,
  displayNumber,
  validUntil,
}: {
  customer: LoyaltyCustomer;
  compact: boolean;
  displayNumber: string;
  validUntil: string;
}) {
  const pad = compact ? "px-4 py-3.5" : "px-5 py-4";

  return (
    <ChampagneCardFace>
      <div className={cn("flex h-full flex-col", pad)}>
      <div className="relative flex items-start justify-center">
        <p
          className={cn(
            "text-center uppercase tracking-[0.28em]",
            compact ? "text-[7px]" : "text-[8px]"
          )}
          style={{ fontFamily: SANS, color: BRONZE }}
        >
          Natus Cosmétiques
        </p>
        <CustomerPointsBadge points={customer.loyalty_points} compact={compact} />
      </div>

      <div className="mt-3 flex flex-1 flex-col items-center justify-center text-center">
        <p
          className={cn(
            "uppercase leading-none",
            compact ? "text-lg" : "text-xl"
          )}
          style={{ fontFamily: SERIF, color: BRONZE, letterSpacing: "0.06em" }}
        >
          Loyalty Card
        </p>
        <p
          className={cn(
            "mt-3 font-medium tracking-[0.14em]",
            compact ? "text-[11px]" : "text-sm"
          )}
          style={{ fontFamily: SERIF, color: BRONZE }}
        >
          {displayNumber}
        </p>
        <p
          className={cn(
            "mt-2 uppercase tracking-[0.12em] opacity-75",
            compact ? "text-[8px]" : "text-[9px]"
          )}
          style={{ fontFamily: SERIF }}
        >
          {customer.full_name}
        </p>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <p
            className={cn(
              "uppercase tracking-[0.12em]",
              compact ? "text-[6px]" : "text-[7px]"
            )}
            style={{ fontFamily: SANS }}
          >
            Valid until
          </p>
          <p
            className={cn("mt-0.5 font-semibold", compact ? "text-[9px]" : "text-[10px]")}
            style={{ fontFamily: SERIF }}
          >
            {validUntil}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BrandCircles compact={compact} />
          <LoyaltyContactlessIcon
            className={compact ? "h-5 w-5" : "h-6 w-6"}
            style={{ color: BRONZE }}
          />
        </div>
      </div>
      </div>
    </ChampagneCardFace>
  );
}

function LoyaltyCardBack({
  customer,
  compact,
  showBarcode,
}: {
  customer: LoyaltyCustomer;
  compact: boolean;
  showBarcode: boolean;
}) {
  const tier = loyaltyTierFromPoints(customer.loyalty_points);
  const pad = compact ? "px-4 pb-3" : "px-5 pb-4";

  return (
    <ChampagneCardFace flipped>
      <div style={{ height: 3, background: GOLD_BAND }} />
      <div className={cn("flex flex-1 flex-col items-center", pad)}>
        <p
          className={cn(
            "mt-3 font-bold uppercase tracking-[0.2em]",
            compact ? "text-[10px]" : "text-xs"
          )}
          style={{ fontFamily: SERIF }}
        >
          Natus
        </p>
        <p
          className={cn(
            "mt-1 uppercase tracking-[0.28em] opacity-70",
            compact ? "text-[5px]" : "text-[6px]"
          )}
          style={{ fontFamily: SANS }}
        >
          Marrakech
        </p>

        <div className="mt-4 grid w-full grid-cols-2 gap-3">
          <div className="text-center">
            <p
              className={cn(
                "uppercase tracking-[0.12em] opacity-60",
                compact ? "text-[5px]" : "text-[6px]"
              )}
              style={{ fontFamily: SANS }}
            >
              Solde points
            </p>
            <p
              className={cn("mt-0.5 font-bold", compact ? "text-sm" : "text-base")}
              style={{ fontFamily: SERIF }}
            >
              {customer.loyalty_points}
            </p>
          </div>
          <div className="text-center">
            <p
              className={cn(
                "uppercase tracking-[0.12em] opacity-60",
                compact ? "text-[5px]" : "text-[6px]"
              )}
              style={{ fontFamily: SANS }}
            >
              Statut
            </p>
            <p
              className={cn(
                "mt-0.5 font-bold uppercase",
                compact ? "text-[9px]" : "text-[10px]"
              )}
              style={{ fontFamily: SERIF }}
            >
              {loyaltyTierLabel(tier)}
            </p>
          </div>
        </div>

        {showBarcode && (
          <div className="mt-auto w-full pt-3">
            <LoyaltyCardBarcode
              value={customer.card_number}
              compact={compact}
              lineColor={BRONZE}
            />
          </div>
        )}
      </div>
    </ChampagneCardFace>
  );
}

export function LoyaltyWalletCardChampagne({
  customer,
  compact = false,
  showBarcode = true,
  flipable = true,
}: {
  customer: LoyaltyCustomer;
  compact?: boolean;
  showBarcode?: boolean;
  flipable?: boolean;
}) {
  const displayNumber = formatLoyaltyCardNumber(customer.card_number);
  const validUntil = formatLoyaltyCardExpiry(customer.created_at);

  return (
    <LoyaltyCardFlipShell
      compact={compact}
      flipable={flipable}
      variant="champagne"
      style={{
        boxShadow: "0 18px 42px rgba(74,68,63,0.22)",
      }}
      front={
        <LoyaltyCardFront
          customer={customer}
          compact={compact}
          displayNumber={displayNumber}
          validUntil={validUntil}
        />
      }
      back={
        <LoyaltyCardBack
          customer={customer}
          compact={compact}
          showBarcode={showBarcode}
        />
      }
    />
  );
}

export function LoyaltyWalletCard({
  customer,
  compact = false,
  showBarcode = true,
  flipable = true,
  variant,
}: {
  customer: LoyaltyCustomer;
  compact?: boolean;
  showBarcode?: boolean;
  flipable?: boolean;
  variant?: LoyaltyCardVariant;
}) {
  const resolvedVariant = resolveLoyaltyCardVariant(variant ?? customer.card_variant);

  if (resolvedVariant === "noir") {
    return (
      <LoyaltyWalletCardNoir
        customer={customer}
        compact={compact}
        showBarcode={showBarcode}
        flipable={flipable}
      />
    );
  }

  if (resolvedVariant === "creme") {
    return (
      <LoyaltyWalletCardCreme
        customer={customer}
        compact={compact}
        showBarcode={showBarcode}
        flipable={flipable}
      />
    );
  }

  return (
    <LoyaltyWalletCardChampagne
      customer={customer}
      compact={compact}
      showBarcode={showBarcode}
      flipable={flipable}
    />
  );
}
