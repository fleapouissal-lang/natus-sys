"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { loyaltyTierFromPoints } from "@/lib/loyalty/tiers";
import {
  formatLoyaltyCardNumber,
  formatLoyaltyCardExpiry,
} from "@/lib/loyalty/card-display";
import { LoyaltyCardBarcode } from "@/components/loyalty/loyalty-card-barcode";
import { LoyaltyContactlessIcon } from "@/components/loyalty/loyalty-card-icons";
import { LoyaltyWalletCardNoir } from "@/components/loyalty/loyalty-wallet-card-noir";
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
  className,
  flipped = false,
}: {
  children: React.ReactNode;
  className?: string;
  flipped?: boolean;
}) {
  return (
    <div
      className={cn(
        "loyalty-wallet-card absolute inset-0 flex flex-col overflow-hidden",
        className
      )}
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

function NatusCardLogo({ compact }: { compact: boolean }) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{
        paddingTop: compact ? 6 : 8,
        paddingBottom: compact ? 4 : 6,
      }}
    >
      <p
        className="leading-none"
        style={{
          fontFamily: SERIF,
          fontWeight: 700,
          fontSize: compact ? 12 : 14,
          color: BRONZE,
          letterSpacing: "0.04em",
        }}
      >
        Natus
      </p>
      <p
        className="mt-0.5 uppercase"
        style={{
          fontFamily: SANS,
          fontSize: compact ? 4 : 5,
          letterSpacing: "0.32em",
          color: BRONZE,
          opacity: 0.65,
        }}
      >
        Marrakech
      </p>
    </div>
  );
}

function StampGrid({
  points,
  compact,
}: {
  points: number;
  compact: boolean;
}) {
  const filled = Math.min(8, Math.max(0, points));
  const size = compact ? 20 : 24;

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {Array.from({ length: 8 }, (_, i) => {
        const on = i < filled;
        const isReward = i === 3 || i === 7;
        return (
          <div
            key={i}
            className="loyalty-wallet-card-round flex items-center justify-center border border-dashed"
            style={{
              width: size,
              height: size,
              borderColor: "rgba(74,68,63,0.45)",
              background: on ? "rgba(197,179,153,0.35)" : "rgba(255,255,255,0.55)",
            }}
          >
            {!on && isReward && i === 3 && (
              <span className="text-[5px] font-bold uppercase leading-tight text-center">
                Silver
              </span>
            )}
            {!on && isReward && i === 7 && (
              <span className="text-[5px] font-bold uppercase leading-tight text-center">
                Gold
              </span>
            )}
            {on && <span className="text-[8px] font-bold">✓</span>}
          </div>
        );
      })}
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
        {/* En-tête */}
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

        {/* Titre */}
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

        {/* Pied */}
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
  const pad = compact ? "px-4 pb-3" : "px-5 pb-4";

  return (
    <ChampagneCardFace flipped>
      <div style={{ height: 3, background: GOLD_BAND }} />
      <NatusCardLogo compact={compact} />

      <div className={cn("flex flex-1 flex-col", pad)}>
        <div className="mt-2 grid grid-cols-[1fr_auto] gap-3">
          <StampGrid points={customer.loyalty_points} compact={compact} />
          <div className="flex flex-col gap-2">
            <div
              className="loyalty-wallet-card-round flex items-center justify-center text-white"
              style={{
                width: compact ? 34 : 40,
                height: compact ? 34 : 40,
                background: `linear-gradient(135deg, ${METAL_GOLD}, ${METAL_BRONZE})`,
                fontSize: compact ? 6 : 7,
                fontWeight: 700,
                textAlign: "center",
                lineHeight: 1.1,
              }}
            >
              {customer.loyalty_points}
              <br />
              PTS
            </div>
            <div
              className="loyalty-wallet-card-round flex items-center justify-center text-white"
              style={{
                width: compact ? 34 : 40,
                height: compact ? 34 : 40,
                background: METAL_BRONZE,
                fontSize: compact ? 7 : 8,
                fontWeight: 700,
              }}
            >
              {loyaltyTierFromPoints(customer.loyalty_points) === "gold"
                ? "VIP"
                : "MEMBER"}
            </div>
          </div>
        </div>

        <p
          className={cn(
            "mt-3 text-center uppercase leading-relaxed tracking-[0.08em]",
            compact ? "text-[5px]" : "text-[6px]"
          )}
          style={{ fontFamily: SANS, color: BRONZE }}
        >
          1 point / 10 MAD · 1 pt = 1 MAD de réduction. Cumulez vos points à chaque
          visite en boutique Natus.
        </p>

        {showBarcode && (
          <div className="mt-auto pt-2">
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
  /** Surcharge ponctuelle (ex. aperçu création) — sinon utilise customer.card_variant */
  variant?: LoyaltyCardVariant;
}) {
  const [flipped, setFlipped] = useState(false);
  const displayNumber = formatLoyaltyCardNumber(customer.card_number);
  const validUntil = formatLoyaltyCardExpiry(customer.created_at);
  const resolvedVariant = resolveLoyaltyCardVariant(variant ?? customer.card_variant);

  if (resolvedVariant === "noir") {
    return (
      <LoyaltyWalletCardNoir
        customer={customer}
        compact={compact}
        showBarcode={showBarcode}
      />
    );
  }

  const card = (
    <div
      className={cn(
        "loyalty-wallet-card relative mx-auto w-full",
        compact ? "max-w-[360px]" : "max-w-[420px]"
      )}
      style={{
        aspectRatio: "1.586 / 1",
        boxShadow: "0 18px 42px rgba(74,68,63,0.22)",
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 0.65s ease",
        }}
      >
        <LoyaltyCardFront
          customer={customer}
          compact={compact}
          displayNumber={displayNumber}
          validUntil={validUntil}
        />
        <LoyaltyCardBack
          customer={customer}
          compact={compact}
          showBarcode={showBarcode}
        />
      </div>
    </div>
  );

  if (!flipable) return card;

  return (
    <div>
      <button
        type="button"
        className="w-full cursor-pointer text-left"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "Voir le recto" : "Voir le verso"}
      >
        {card}
      </button>
      <p className="mt-2 text-center text-xs text-muted">
        {flipped ? "Recto" : "Verso"} — appuyez pour retourner
      </p>
    </div>
  );
}
