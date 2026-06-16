"use client";

import { useEffect, useRef, useState } from "react";
import Barcode from "react-barcode";
import { cn } from "@/lib/utils";
import { loyaltyCardBarcodeValue } from "@/lib/loyalty/qr";

const CARD_GOLD = "#EBD4BA";
const BARCODE_QUIET_ZONE = 6;

/** Estimation modules CODE128-B (start + chars + checksum + stop) */
function estimateCode128Modules(value: string): number {
  return 35 + value.length * 11;
}

export function LoyaltyCardBarcode({
  value,
  compact = false,
  className,
  showValue = false,
  lineColor = CARD_GOLD,
  backgroundColor = "transparent",
}: {
  value: string;
  compact?: boolean;
  className?: string;
  showValue?: boolean;
  lineColor?: string;
  /** Fond clair (#FFF6EC) requis pour un scan fiable sur carte sombre */
  backgroundColor?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const encoded = loyaltyCardBarcodeValue(value);
  const [barWidth, setBarWidth] = useState(2);
  const barHeight = compact ? 44 : 52;
  const scanOptimized = backgroundColor !== "transparent";

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const available = container.clientWidth;
      if (available <= 0) return;
      const modules = estimateCode128Modules(encoded);
      const next = Math.floor((available - BARCODE_QUIET_ZONE * 2) / modules);
      const minWidth = scanOptimized ? 2 : 1;
      setBarWidth(Math.max(minWidth, Math.min(3, next)));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [encoded, scanOptimized]);

  return (
    <div ref={containerRef} className={cn("w-full", className)}>
      <div
        className={cn(
          "flex w-full flex-col items-center overflow-visible",
          scanOptimized && "px-1 py-1"
        )}
        style={{
          backgroundColor,
          borderRadius: scanOptimized ? 4 : undefined,
        }}
      >
        <Barcode
          value={encoded}
          format="CODE128"
          width={barWidth}
          height={barHeight}
          displayValue={false}
          margin={BARCODE_QUIET_ZONE}
          background={backgroundColor}
          lineColor={lineColor}
        />
        {showValue && (
          <p
            className="mt-0.5 text-center font-mono text-[8px] tracking-[0.14em]"
            style={{ color: scanOptimized ? "#1a1a1a" : lineColor }}
          >
            {encoded}
          </p>
        )}
      </div>
    </div>
  );
}
