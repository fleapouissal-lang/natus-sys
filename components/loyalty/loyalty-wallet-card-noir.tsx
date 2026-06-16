"use client";

import { cn } from "@/lib/utils";
import { loyaltyTierFromPoints, loyaltyTierLabel } from "@/lib/loyalty/tiers";
import {
  formatLoyaltyCardNumber,
  formatMemberSinceLuxury,
} from "@/lib/loyalty/card-display";
import { LoyaltyCardBarcode } from "@/components/loyalty/loyalty-card-barcode";
import {
  LoyaltyCardChipContactless,
  LoyaltyCardBrandCircles,
} from "@/components/loyalty/loyalty-card-icons";
import { LoyaltyCardFlipShell } from "@/components/loyalty/loyalty-card-flip-shell";
import type { LoyaltyCustomer, LoyaltyTier } from "@/lib/types";

const CARD_BG = "#0a0a0a";
const CARD_GOLD = "#EBD4BA";
const SERIF = "Georgia, 'Times New Roman', Times, serif";
const MONO = "ui-monospace, 'Cascadia Code', 'Courier New', monospace";

function NoirCardFace({
  children,
  flipped = false,
}: {
  children: React.ReactNode;
  flipped?: boolean;
}) {
  return (
    <div
      className="loyalty-wallet-card absolute inset-0 flex flex-col overflow-hidden"
      style={{
        backgroundColor: CARD_BG,
        border: `1px solid ${CARD_GOLD}`,
        backfaceVisibility: "hidden",
        transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        color: CARD_GOLD,
      }}
    >
      {children}
    </div>
  );
}

function TierBadge({
  tier,
  compact,
}: {
  tier: LoyaltyTier;
  compact: boolean;
}) {
  const label = loyaltyTierLabel(tier);

  return (
    <div
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 font-bold uppercase text-black",
        compact ? "text-[7px] tracking-[0.08em]" : "text-[8px] tracking-[0.1em]"
      )}
      style={{ backgroundColor: "#FFF6EC" }}
    >
      {label}
    </div>
  );
}

function NoirCardFront({
  customer,
  compact,
}: {
  customer: LoyaltyCustomer;
  compact: boolean;
}) {
  const tier = loyaltyTierFromPoints(customer.loyalty_points);
  const displayNumber = formatLoyaltyCardNumber(customer.card_number);
  const numberGroups = displayNumber.split(" ");
  const memberSince = formatMemberSinceLuxury(customer.created_at);
  const padX = compact ? "px-4" : "px-5";

  return (
    <NoirCardFace>
      <div
        className={cn(
          "grid h-full min-h-0 content-between",
          padX,
          compact ? "gap-y-2 py-3.5" : "gap-y-2.5 py-4"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={cn(
                "font-bold uppercase leading-none",
                compact ? "text-xs" : "text-sm"
              )}
              style={{ fontFamily: SERIF }}
            >
              Natus
            </p>
            <p
              className={cn(
                "mt-1 uppercase tracking-[0.2em] opacity-75",
                compact ? "text-[6px]" : "text-[7px]"
              )}
              style={{ fontFamily: SERIF }}
            >
              Maison de Prestige
            </p>
          </div>
          <TierBadge tier={tier} compact={compact} />
        </div>

        <div className="flex flex-col gap-2">
          <LoyaltyCardChipContactless
            compact={compact}
            className={compact ? "-mx-4 px-3" : "-mx-5 px-4"}
          />
          <div
            className={cn(
              "flex w-full items-center justify-between",
              compact ? "-mx-4 px-3" : "-mx-5 px-4"
            )}
          >
            {numberGroups.map((group, i) => (
              <span
                key={i}
                className={cn(
                  "font-semibold tabular-nums",
                  compact ? "text-sm" : "text-lg"
                )}
                style={{ fontFamily: MONO }}
              >
                {group}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 items-start gap-1">
          <div className="min-w-0">
            <p className="text-[6px] uppercase tracking-[0.14em] opacity-55">Titulaire</p>
            <p
              className={cn(
                "mt-0.5 truncate font-bold uppercase",
                compact ? "text-[8px]" : "text-[9px]"
              )}
              style={{ fontFamily: SERIF }}
            >
              {customer.full_name}
            </p>
          </div>
          <div className="min-w-0 text-right">
            <p className="text-[6px] uppercase tracking-[0.14em] opacity-55">Membre depuis</p>
            <p className={cn("mt-0.5 font-bold", compact ? "text-[8px]" : "text-[9px]")}>
              {memberSince}
            </p>
          </div>
        </div>

        <div className={cn("flex items-center justify-between pb-1", padX, "-mx-4 sm:-mx-5")}>
          <p
            className={cn(
              "uppercase tracking-[0.18em] opacity-60",
              compact ? "text-[6px]" : "text-[7px]"
            )}
          >
            Natus Carte
          </p>
          <LoyaltyCardBrandCircles />
        </div>
      </div>
    </NoirCardFace>
  );
}

function NoirCardBack({
  customer,
  compact,
  showBarcode,
}: {
  customer: LoyaltyCustomer;
  compact: boolean;
  showBarcode: boolean;
}) {
  const tier = loyaltyTierFromPoints(customer.loyalty_points);
  const padX = compact ? "px-4 pb-3" : "px-5 pb-4";

  return (
    <NoirCardFace flipped>
      <p
        className={cn(
          "shrink-0 pt-3 text-center font-bold uppercase tracking-[0.22em]",
          compact ? "text-[9px]" : "text-[10px]"
        )}
        style={{ fontFamily: SERIF, color: CARD_GOLD }}
      >
        Natus
      </p>

      <div className={cn("flex flex-1 flex-col", padX)}>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[6px] uppercase tracking-[0.14em] opacity-55">Solde points</p>
            <p className={cn("mt-0.5 font-bold", compact ? "text-sm" : "text-base")}>
              {customer.loyalty_points} pts
            </p>
          </div>
          <div className="text-right">
            <p className="text-[6px] uppercase tracking-[0.14em] opacity-55">Statut</p>
            <p className={cn("mt-0.5 font-bold uppercase", compact ? "text-[9px]" : "text-[10px]")}>
              {loyaltyTierLabel(tier)}
            </p>
          </div>
        </div>

        {showBarcode && (
          <div className="mt-auto pt-2">
            <LoyaltyCardBarcode value={customer.card_number} compact={compact} />
          </div>
        )}
      </div>
    </NoirCardFace>
  );
}

export function LoyaltyWalletCardNoir({
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
  return (
    <LoyaltyCardFlipShell
      compact={compact}
      flipable={flipable}
      variant="noir"
      style={{
        boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
      }}
      front={<NoirCardFront customer={customer} compact={compact} />}
      back={
        <NoirCardBack
          customer={customer}
          compact={compact}
          showBarcode={showBarcode}
        />
      }
    />
  );
}
