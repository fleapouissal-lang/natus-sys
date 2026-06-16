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
import type { LoyaltyCustomer, LoyaltyTier } from "@/lib/types";

const CARD_BG = "#0a0a0a";
const CARD_GOLD = "#EBD4BA";
const SERIF = "Georgia, 'Times New Roman', Times, serif";
const MONO = "ui-monospace, 'Cascadia Code', 'Courier New', monospace";

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

export function LoyaltyWalletCardNoir({
  customer,
  compact = false,
  showBarcode = true,
}: {
  customer: LoyaltyCustomer;
  compact?: boolean;
  showBarcode?: boolean;
}) {
  const tier = loyaltyTierFromPoints(customer.loyalty_points);
  const displayNumber = formatLoyaltyCardNumber(customer.card_number);
  const numberGroups = displayNumber.split(" ");
  const memberSince = formatMemberSinceLuxury(customer.created_at);

  const padX = compact ? "px-4" : "px-5";

  return (
    <div
      className={cn(
        "loyalty-wallet-card relative mx-auto w-full overflow-hidden",
        compact ? "max-w-[360px]" : "max-w-[420px]"
      )}
      style={{
        aspectRatio: "1.586 / 1",
        backgroundColor: CARD_BG,
        border: `1px solid ${CARD_GOLD}`,
        boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
      }}
    >
      <div className="grid h-full grid-rows-[1fr_auto]">
        <div
          className={cn(
            "grid min-h-0 content-between",
            padX,
            compact ? "gap-y-2 py-3.5" : "gap-y-2.5 py-4"
          )}
          style={{ color: CARD_GOLD }}
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

          <div className="grid grid-cols-3 items-start gap-1">
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
            <div className="text-center">
              <p className="text-[6px] uppercase tracking-[0.14em] opacity-55">Points</p>
              <p className={cn("mt-0.5 font-bold", compact ? "text-[9px]" : "text-[10px]")}>
                {customer.loyalty_points}
              </p>
            </div>
            <div className="min-w-0 text-right">
              <p className="text-[6px] uppercase tracking-[0.14em] opacity-55">Membre depuis</p>
              <p className={cn("mt-0.5 font-bold", compact ? "text-[8px]" : "text-[9px]")}>
                {memberSince}
              </p>
            </div>
          </div>
        </div>

        {showBarcode ? (
          <div className="w-full shrink-0">
            <p
              className={cn(
                "mb-1.5 text-center uppercase tracking-[0.18em] opacity-60",
                compact ? "text-[6px]" : "text-[7px]"
              )}
              style={{ color: CARD_GOLD }}
            >
              Natus Carte
            </p>
            <div className={cn("w-full", compact ? "px-2 pb-2" : "px-3 pb-2.5")}>
              <LoyaltyCardBarcode value={customer.card_number} compact={compact} />
            </div>
          </div>
        ) : (
          <div className={cn("flex justify-end pb-3", padX)}>
            <LoyaltyCardBrandCircles />
          </div>
        )}
      </div>
    </div>
  );
}
