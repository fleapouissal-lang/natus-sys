"use client";

import {
  CreditCard,
  Phone,
  Star,
  Mail,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatLoyaltyCardNumber,
  formatLoyaltyCardExpiry,
} from "@/lib/loyalty/card-display";
import { formatPhoneDisplay } from "@/lib/loyalty/phone";
import { loyaltyCardScanPayload } from "@/lib/loyalty/qr";
import { LoyaltyCardBarcode } from "@/components/loyalty/loyalty-card-barcode";
import { LoyaltyCardQr } from "@/components/loyalty/loyalty-card-qr";
import { LoyaltyCardFlipShell } from "@/components/loyalty/loyalty-card-flip-shell";
import type { LoyaltyCustomer } from "@/lib/types";

const STRIP = "#B38C4A";
const STRIP_DEEP = "#8F6B38";
const STRIP_LIGHT = "#C9A066";
const CREAM = "#FFF6EC";
const CREAM_SOFT = "#FFFDF9";
const INK = "#4A443F";
const INK_SOFT = "#6B635C";
const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS = "var(--font-jost), system-ui, sans-serif";

const STRIP_GRADIENT = `linear-gradient(165deg, ${STRIP_LIGHT} 0%, ${STRIP} 42%, ${STRIP_DEEP} 100%)`;
const CREAM_GRADIENT = `radial-gradient(ellipse 120% 90% at 88% 8%, rgba(179,140,74,0.07) 0%, transparent 55%), linear-gradient(180deg, ${CREAM_SOFT} 0%, ${CREAM} 100%)`;

function CremeCardFace({
  children,
  flipped = false,
}: {
  children: React.ReactNode;
  flipped?: boolean;
}) {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        backfaceVisibility: "hidden",
        transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
      }}
    >
      {children}
    </div>
  );
}

function CremeMonogram({
  compact,
  className,
  style,
}: {
  compact: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={cn("pointer-events-none absolute select-none leading-none", className)}
      style={{
        fontFamily: SERIF,
        fontSize: compact ? 128 : 168,
        fontWeight: 700,
        color: STRIP,
        opacity: 0.11,
        ...style,
      }}
      aria-hidden
    >
      N
    </span>
  );
}

function NatusCremeLogo({ compact }: { compact: boolean }) {
  return (
    <div>
      <p
        className="leading-none"
        style={{
          fontFamily: SERIF,
          fontWeight: 600,
          fontSize: compact ? 12 : 14,
          color: STRIP,
          letterSpacing: "0.04em",
        }}
      >
        natus
      </p>
      <p
        className="mt-0.5 uppercase"
        style={{
          fontFamily: SANS,
          fontSize: compact ? 4.5 : 5,
          letterSpacing: "0.36em",
          color: STRIP,
          opacity: 0.68,
        }}
      >
        Marrakech
      </p>
    </div>
  );
}

function CremeInfoRow({
  icon,
  label,
  children,
  compact,
  accent,
}: {
  icon: React.ReactNode;
  label?: string;
  children: React.ReactNode;
  compact: boolean;
  accent?: boolean;
}) {
  const circle = compact ? 16 : 18;

  return (
    <div className="flex items-start gap-2">
      <div
        className="loyalty-wallet-card-round mt-px flex shrink-0 items-center justify-center shadow-sm"
        style={{
          width: circle,
          height: circle,
          background: `linear-gradient(145deg, ${STRIP_LIGHT}, ${STRIP_DEEP})`,
          color: CREAM,
          boxShadow: "0 1px 3px rgba(79,58,28,0.22)",
        }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        {label && (
          <p
            className={cn(
              "mb-0.5 uppercase tracking-[0.16em]",
              compact ? "text-[5px]" : "text-[5.5px]"
            )}
            style={{ fontFamily: SANS, color: INK_SOFT }}
          >
            {label}
          </p>
        )}
        <div
          className={cn("leading-snug", compact ? "text-[7px]" : "text-[8px]")}
          style={{
            fontFamily: accent ? SERIF : SANS,
            color: accent ? STRIP : INK,
            fontWeight: accent ? 600 : 500,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function CremeCardFront({
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
  const qrSize = compact ? 80 : 96;
  const qrPayload = loyaltyCardScanPayload(customer.card_number);
  const pad = compact ? "py-2.5 pr-3 pl-2.5" : "py-3 pr-4 pl-3";
  const iconSize = compact ? 7.5 : 8.5;

  return (
    <CremeCardFace>
      <div
        className="loyalty-creme-shell flex h-full w-full border"
        style={{ borderColor: "rgba(179,140,74,0.28)" }}
      >
        <div
          className="loyalty-creme-strip relative flex w-[32%] shrink-0 flex-col items-center justify-center px-1"
          style={{ background: STRIP_GRADIENT }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-12deg, transparent, transparent 3px, rgba(255,246,236,0.35) 3px, rgba(255,246,236,0.35) 4px)",
            }}
            aria-hidden
          />
          <div
            className="relative rounded-md"
            style={{
              boxShadow: "0 4px 14px rgba(0,0,0,0.16)",
            }}
          >
            <LoyaltyCardQr value={qrPayload} size={qrSize} scanOptimized />
          </div>
        </div>

        <div
          className="loyalty-creme-main relative flex min-w-0 flex-1 flex-col"
          style={{
            background: CREAM_GRADIENT,
            color: INK,
          }}
        >
          <CremeMonogram
            compact={compact}
            style={{
              bottom: compact ? "-16%" : "-12%",
              right: compact ? "-8%" : "-5%",
              lineHeight: 0.78,
            }}
          />

          <div
            className="absolute left-0 z-[2]"
            style={{
              top: compact ? "14%" : "16%",
              bottom: compact ? "8%" : "10%",
              width: 1,
              background: `linear-gradient(180deg, transparent, ${STRIP} 12%, ${STRIP} 88%, transparent)`,
              opacity: 0.55,
            }}
            aria-hidden
          />

          <div className={cn("relative z-[1] flex min-h-0 flex-1 flex-col", pad)}>
            <div className="pl-1">
              <NatusCremeLogo compact={compact} />
            </div>

            <div className="mt-2.5 pl-1 pr-1">
              <p
                className={cn(
                  "truncate uppercase leading-tight tracking-[0.06em]",
                  compact ? "text-[9px]" : "text-[10px]"
                )}
                style={{ fontFamily: SERIF, fontWeight: 600, color: INK }}
              >
                {customer.full_name}
              </p>
              <div
                className="mt-2"
                style={{
                  height: 1,
                  background: `linear-gradient(90deg, ${STRIP} 0%, rgba(179,140,74,0.15) 100%)`,
                }}
              />
            </div>

            <div
              className={cn(
                "mt-2.5 flex min-h-0 flex-1 flex-col pl-1",
                compact ? "gap-1.5" : "gap-2"
              )}
            >
              <CremeInfoRow
                compact={compact}
                label="Carte"
                icon={<CreditCard size={iconSize} strokeWidth={1.75} />}
              >
                <span className="font-medium tracking-[0.1em]" style={{ fontFamily: SERIF }}>
                  {displayNumber}
                </span>
              </CremeInfoRow>

              {customer.phone?.trim() && (
                <CremeInfoRow
                  compact={compact}
                  label="Téléphone"
                  icon={<Phone size={iconSize} strokeWidth={1.75} />}
                >
                  {formatPhoneDisplay(customer.phone)}
                </CremeInfoRow>
              )}

              {customer.email && (
                <CremeInfoRow
                  compact={compact}
                  label="Email"
                  icon={<Mail size={iconSize} strokeWidth={1.75} />}
                >
                  <span className="truncate">{customer.email}</span>
                </CremeInfoRow>
              )}

              <CremeInfoRow
                compact={compact}
                label="Fidélité"
                accent
                icon={<Star size={iconSize} strokeWidth={1.75} fill="currentColor" />}
              >
                {customer.loyalty_points} points
              </CremeInfoRow>

              <CremeInfoRow
                compact={compact}
                label="Validité"
                icon={<Calendar size={iconSize} strokeWidth={1.75} />}
              >
                {validUntil}
              </CremeInfoRow>
            </div>
          </div>
        </div>
      </div>
    </CremeCardFace>
  );
}

function CremeCardBack({
  customer,
  compact,
  showBarcode,
  cardNumber,
}: {
  customer: LoyaltyCustomer;
  compact: boolean;
  showBarcode: boolean;
  cardNumber: string;
}) {
  return (
    <CremeCardFace flipped>
      <div
        className="loyalty-creme-shell loyalty-wallet-card relative flex h-full w-full flex-col border"
        style={{
          background: STRIP_GRADIENT,
          borderColor: "rgba(255,246,236,0.18)",
        }}
      >
        <CremeMonogram
          compact={compact}
          className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            fontSize: compact ? 132 : 168,
            color: CREAM,
            opacity: 0.08,
          }}
        />

        <div className="relative z-[1] flex flex-1 flex-col items-center justify-center px-4 text-center">
          <p
            className={cn(
              "lowercase tracking-[0.06em]",
              compact ? "text-[1.35rem]" : "text-[1.85rem]"
            )}
            style={{
              fontFamily: SERIF,
              fontWeight: 600,
              color: CREAM,
              textShadow: "0 1px 8px rgba(0,0,0,0.12)",
            }}
          >
            natus
          </p>
          <div
            className="mx-auto mt-2"
            style={{
              height: 1,
              width: compact ? 52 : 64,
              background: `linear-gradient(90deg, transparent, ${CREAM}, transparent)`,
              opacity: 0.7,
            }}
          />
          <p
            className={cn(
              "mt-2 uppercase tracking-[0.3em]",
              compact ? "text-[5px]" : "text-[6px]"
            )}
            style={{ fontFamily: SANS, color: CREAM, opacity: 0.88 }}
          >
            Marrakech
          </p>
          <p
            className={cn(
              "mt-3 max-w-full truncate uppercase tracking-[0.08em]",
              compact ? "text-[8px]" : "text-[9px]"
            )}
            style={{ fontFamily: SERIF, fontWeight: 600, color: CREAM }}
          >
            {customer.full_name}
          </p>
        </div>

        {showBarcode && (
          <div className="relative z-[1] px-3 pb-2.5 pt-1">
            <LoyaltyCardBarcode
              value={cardNumber}
              compact={compact}
              lineColor="#000000"
              backgroundColor="#FFF6EC"
            />
          </div>
        )}
      </div>
    </CremeCardFace>
  );
}

export function LoyaltyWalletCardCreme({
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
      variant="creme"
      style={{
        boxShadow:
          "0 10px 28px rgba(143,107,56,0.18), 0 2px 6px rgba(74,68,63,0.08), inset 0 1px 0 rgba(255,255,255,0.45)",
      }}
      front={
        <CremeCardFront
          customer={customer}
          compact={compact}
          displayNumber={displayNumber}
          validUntil={validUntil}
        />
      }
      back={
        <CremeCardBack
          customer={customer}
          compact={compact}
          showBarcode={showBarcode}
          cardNumber={customer.card_number}
        />
      }
    />
  );
}
