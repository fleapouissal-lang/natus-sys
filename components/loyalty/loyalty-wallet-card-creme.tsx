"use client";

import {
  CreditCard,
  Phone,
  Star,
  User,
  Mail,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatLoyaltyCardNumber,
  formatLoyaltyCardExpiry,
} from "@/lib/loyalty/card-display";
import { formatPhoneDisplay } from "@/lib/loyalty/phone";
import { loyaltyCardPublicUrl } from "@/lib/loyalty/qr";
import { LoyaltyCardBarcode } from "@/components/loyalty/loyalty-card-barcode";
import { LoyaltyCardQr } from "@/components/loyalty/loyalty-card-qr";
import { LoyaltyCardFlipShell } from "@/components/loyalty/loyalty-card-flip-shell";
import type { LoyaltyCustomer } from "@/lib/types";

const STRIP = "#B38C4A";
const CREAM = "#FFF6EC";
const INK = "#4A443F";
const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS = "var(--font-jost), system-ui, sans-serif";

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

function NatusCremeLogo({ compact }: { compact: boolean }) {
  return (
    <div>
      <p
        className="leading-none"
        style={{
          fontFamily: SERIF,
          fontWeight: 600,
          fontSize: compact ? 13 : 15,
          color: STRIP,
          letterSpacing: "0.02em",
        }}
      >
        natus
      </p>
      <p
        className="mt-0.5 uppercase"
        style={{
          fontFamily: SANS,
          fontSize: compact ? 4.5 : 5,
          letterSpacing: "0.34em",
          color: STRIP,
          opacity: 0.72,
        }}
      >
        Marrakech
      </p>
    </div>
  );
}

function CremeInfoRow({
  icon,
  children,
  compact,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  compact: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex shrink-0 items-center justify-center",
          compact ? "h-3.5 w-3.5" : "h-4 w-4"
        )}
        style={{ color: STRIP }}
      >
        {icon}
      </div>
      <div
        className={cn(
          "min-w-0 leading-snug",
          compact ? "text-[7px]" : "text-[8px]"
        )}
        style={{ fontFamily: SANS, color: INK }}
      >
        {children}
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
  const qrSize = compact ? 46 : 56;
  const qrUrl = loyaltyCardPublicUrl(customer.qr_token);
  const pad = compact ? "px-3 py-2.5" : "px-4 py-3";
  const iconSize = compact ? 10 : 11;

  return (
    <CremeCardFace>
      <div className="flex h-full w-full">
        <div
          className="loyalty-creme-strip flex w-[21%] shrink-0 items-center justify-center"
          style={{ backgroundColor: STRIP }}
        >
          <div className={compact ? "w-[68%]" : "w-[70%]"}>
            <LoyaltyCardQr value={qrUrl} size={qrSize} />
          </div>
        </div>

        <div
          className="loyalty-creme-main relative flex min-w-0 flex-1 flex-col border-l"
          style={{
            backgroundColor: CREAM,
            color: INK,
            borderColor: "rgba(74,68,63,0.18)",
          }}
        >
          <div
            className="pointer-events-none absolute select-none"
            style={{
              right: compact ? "-8%" : "-5%",
              bottom: compact ? "-20%" : "-15%",
              fontFamily: SERIF,
              fontSize: compact ? 112 : 148,
              fontWeight: 700,
              lineHeight: 0.82,
              color: STRIP,
              opacity: 0.09,
            }}
            aria-hidden
          >
            N
          </div>

          <div className={cn("relative z-[1] flex min-h-0 flex-1 flex-col", pad)}>
            <NatusCremeLogo compact={compact} />
            <div
              className="mt-2"
              style={{
                height: 1,
                width: compact ? 64 : 80,
                backgroundColor: STRIP,
                opacity: 0.5,
              }}
            />
            <p
              className={cn(
                "mt-1.5 uppercase tracking-[0.16em]",
                compact ? "text-[5px]" : "text-[6px]"
              )}
              style={{ fontFamily: SANS, color: STRIP }}
            >
              Natus Cosmétiques · Carte Fidélité
            </p>

            <div className={cn("mt-3 space-y-2", compact ? "space-y-1.5" : "space-y-2")}>
              <CremeInfoRow
                compact={compact}
                icon={<User size={iconSize} strokeWidth={1.75} />}
              >
                <span className="font-semibold uppercase" style={{ fontFamily: SERIF }}>
                  {customer.full_name}
                </span>
              </CremeInfoRow>

              <CremeInfoRow
                compact={compact}
                icon={<CreditCard size={iconSize} strokeWidth={1.75} />}
              >
                <span className="font-medium tracking-[0.08em]" style={{ fontFamily: SERIF }}>
                  {displayNumber}
                </span>
              </CremeInfoRow>

              <CremeInfoRow
                compact={compact}
                icon={<Phone size={iconSize} strokeWidth={1.75} />}
              >
                {formatPhoneDisplay(customer.phone)}
              </CremeInfoRow>

              {customer.email && (
                <CremeInfoRow
                  compact={compact}
                  icon={<Mail size={iconSize} strokeWidth={1.75} />}
                >
                  {customer.email}
                </CremeInfoRow>
              )}

              <CremeInfoRow
                compact={compact}
                icon={<Star size={iconSize} strokeWidth={1.75} />}
              >
                <span className="font-semibold" style={{ color: STRIP }}>
                  {customer.loyalty_points} points
                </span>
              </CremeInfoRow>

              <CremeInfoRow
                compact={compact}
                icon={<Calendar size={iconSize} strokeWidth={1.75} />}
              >
                Valid until {validUntil}
              </CremeInfoRow>
            </div>
          </div>
        </div>
      </div>
    </CremeCardFace>
  );
}

function CremeCardBack({
  compact,
  showBarcode,
  cardNumber,
}: {
  compact: boolean;
  showBarcode: boolean;
  cardNumber: string;
}) {
  return (
    <CremeCardFace flipped>
      <div
        className="loyalty-wallet-card relative flex h-full w-full flex-col items-center justify-center"
        style={{ backgroundColor: STRIP }}
      >
        <div className="text-center">
          <p
            className={cn(
              "lowercase tracking-[0.04em]",
              compact ? "text-2xl" : "text-[1.75rem]"
            )}
            style={{
              fontFamily: SERIF,
              fontWeight: 600,
              color: CREAM,
            }}
          >
            natus
          </p>
          <div
            className="mx-auto mt-2"
            style={{
              height: 1,
              width: compact ? 48 : 56,
              backgroundColor: CREAM,
              opacity: 0.55,
            }}
          />
          <p
            className={cn(
              "mt-2 uppercase tracking-[0.28em]",
              compact ? "text-[5px]" : "text-[6px]"
            )}
            style={{ fontFamily: SANS, color: CREAM, opacity: 0.85 }}
          >
            Marrakech
          </p>
        </div>

        {showBarcode && (
          <div className="absolute bottom-0 left-0 right-0 px-3 pb-2">
            <LoyaltyCardBarcode
              value={cardNumber}
              compact={compact}
              lineColor={CREAM}
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
        boxShadow: "0 16px 38px rgba(179,140,74,0.22)",
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
          compact={compact}
          showBarcode={showBarcode}
          cardNumber={customer.card_number}
        />
      }
    />
  );
}
