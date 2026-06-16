"use client";

import { useId } from "react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

const CHIP_GOLD = "#EBD4BA";

/** Puce EMV dorée — fond transparent */
export function LoyaltyCardChip({ className }: { className?: string }) {
  const gradId = useId();

  return (
    <svg
      viewBox="0 0 44 32"
      fill="none"
      className={cn("h-[26px] w-auto shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5e8d4" />
          <stop offset="40%" stopColor={CHIP_GOLD} />
          <stop offset="100%" stopColor="#a88958" />
        </linearGradient>
      </defs>
      {/* Cadre léger */}
      <rect
        x="0.75"
        y="0.75"
        width="42.5"
        height="30.5"
        rx="4"
        stroke={`url(#${gradId})`}
        strokeWidth="0.75"
        opacity="0.45"
      />
      {/* Piste centrale */}
      <rect x="17.5" y="4.5" width="9" height="23" rx="1.2" fill={`url(#${gradId})`} />
      {/* Pistes gauche */}
      <rect x="4.5" y="4.5" width="11" height="5.5" rx="1" fill={`url(#${gradId})`} />
      <rect x="4.5" y="13.25" width="11" height="5.5" rx="1" fill={`url(#${gradId})`} />
      <rect x="4.5" y="22" width="11" height="5.5" rx="1" fill={`url(#${gradId})`} />
      {/* Pistes droite */}
      <rect x="28.5" y="4.5" width="11" height="5.5" rx="1" fill={`url(#${gradId})`} />
      <rect x="28.5" y="13.25" width="11" height="5.5" rx="1" fill={`url(#${gradId})`} />
      <rect x="28.5" y="22" width="11" height="5.5" rx="1" fill={`url(#${gradId})`} />
    </svg>
  );
}

/** Sans contact style Wi-Fi / paiement — fond transparent */
export function LoyaltyContactlessIcon({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("shrink-0 text-[#EBD4BA]", className)}
      style={style}
      aria-hidden
    >
      {/* Wi-Fi ouvert à droite, incliné comme sur carte bancaire */}
      <g transform="translate(12 12) rotate(0) translate(-12 -12)">
        <g transform="translate(12 12) rotate(90) translate(-12 -12)">
          <circle cx="12" cy="20.5" r="1.35" fill="currentColor" />
          <path
            d="M8.5 17a4.5 4.5 0 0 1 7 0"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M5.25 13.75a8.25 8.25 0 0 1 13.5 0"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M2 10.5a12 12 0 0 1 20 0"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </g>
      </g>
    </svg>
  );
}

/** Puce à gauche, sans contact à droite */
export function LoyaltyCardChipContactless({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full items-center justify-between", className)}>
      <LoyaltyCardChip className={compact ? "!h-[22px]" : "!h-[26px]"} />
      <LoyaltyContactlessIcon className={compact ? "h-8 w-8" : "h-9 w-9"} />
    </div>
  );
}

export function LoyaltyCardBrandCircles({ className }: { className?: string }) {
  return (
    <div className={className} style={{ display: "flex", alignItems: "center" }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "#EBD4BA",
          opacity: 0.85,
        }}
      />
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "#EBD4BA",
          opacity: 0.55,
          marginLeft: -12,
        }}
      />
    </div>
  );
}

export function LoyaltyDiamondIcon({
  className,
  size = 10,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M6 0.5 11.2 6 6 11.5 0.8 6Z" />
    </svg>
  );
}

export function LoyaltyCardStarEmblem({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const outer = compact ? 52 : 64;
  return (
    <div
      className={className}
      style={{ width: outer, height: outer, position: "relative" }}
      aria-hidden
    >
      <div
        className="absolute inset-0 rounded-full border loyalty-wallet-card-round"
        style={{ borderColor: "rgba(235,212,186,0.35)" }}
      />
      <div
        className="absolute rounded-full border loyalty-wallet-card-round"
        style={{
          top: compact ? 7 : 9,
          left: compact ? 7 : 9,
          right: compact ? 7 : 9,
          bottom: compact ? 7 : 9,
          borderColor: "rgba(235,212,186,0.55)",
        }}
      />
      <div
        className="absolute rounded-full border loyalty-wallet-card-round"
        style={{
          top: compact ? 14 : 17,
          left: compact ? 14 : 17,
          right: compact ? 14 : 17,
          bottom: compact ? 14 : 17,
          borderColor: "rgba(235,212,186,0.75)",
        }}
      />
      <svg
        viewBox="0 0 24 24"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: compact ? 16 : 20,
          height: compact ? 16 : 20,
          color: "#EBD4BA",
        }}
        fill="currentColor"
      >
        <path d="M12 2.5 14.8 9.2 22 9.8 16.5 14.5 18.2 21.5 12 17.8 5.8 21.5 7.5 14.5 2 9.8 9.2 9.2Z" />
      </svg>
    </div>
  );
}
