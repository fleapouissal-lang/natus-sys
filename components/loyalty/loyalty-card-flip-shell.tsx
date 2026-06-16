"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LoyaltyCardVariant } from "@/lib/types";

export function LoyaltyCardFlipShell({
  front,
  back,
  compact = false,
  flipable = true,
  variant = "champagne",
  className,
  style,
}: {
  front: ReactNode;
  back: ReactNode;
  compact?: boolean;
  flipable?: boolean;
  variant?: LoyaltyCardVariant;
  className?: string;
  style?: CSSProperties;
}) {
  const [flipped, setFlipped] = useState(false);
  const isNoir = variant === "noir";
  const isCreme = variant === "creme";

  const card = (
    <div
      className={cn(
        "loyalty-wallet-card relative mx-auto w-full",
        compact ? "max-w-[360px]" : "max-w-[420px]",
        className
      )}
      style={{
        aspectRatio: "1.586 / 1",
        ...style,
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 0.55s ease",
        }}
      >
        {front}
        {back}
      </div>
    </div>
  );

  if (!flipable) return card;

  const arrowBtn = cn(
    "flex h-8 w-8 items-center justify-center rounded-full border transition-colors cursor-pointer",
    "disabled:cursor-default disabled:opacity-30",
    isNoir
      ? "border-[#EBD4BA]/35 bg-[#0a0a0a] text-[#EBD4BA] hover:bg-[#EBD4BA]/10"
      : isCreme
        ? "border-[#B38C4A]/35 bg-[#FFF6EC] text-[#B38C4A] hover:bg-[#B38C4A]/10"
        : "border-[#4A443F]/20 bg-white/70 text-[#4A443F] hover:bg-white"
  );

  const labelClass = cn(
    "min-w-[4.5rem] text-center text-xs font-medium uppercase tracking-[0.14em]",
    isNoir ? "text-[#EBD4BA]/80" : isCreme ? "text-[#B38C4A]/80" : "text-muted"
  );

  return (
    <div className="w-full">
      {card}
      <div className="mt-2.5 flex items-center justify-center gap-3">
        <button
          type="button"
          className={arrowBtn}
          onClick={() => setFlipped(false)}
          disabled={!flipped}
          aria-label="Recto — face avant"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
        </button>
        <span className={labelClass}>{flipped ? "Verso" : "Recto"}</span>
        <button
          type="button"
          className={arrowBtn}
          onClick={() => setFlipped(true)}
          disabled={flipped}
          aria-label="Verso — face arrière"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}
