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
}: {
  value: string;
  compact?: boolean;
  className?: string;
  showValue?: boolean;
  lineColor?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const encoded = loyaltyCardBarcodeValue(value);
  const [barWidth, setBarWidth] = useState(2);
  const barHeight = compact ? 40 : 48;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const available = container.clientWidth;
      if (available <= 0) return;
      const modules = estimateCode128Modules(encoded);
      const next = Math.floor((available - BARCODE_QUIET_ZONE * 2) / modules);
      setBarWidth(Math.max(1, Math.min(3, next)));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [encoded]);

  return (
    <div ref={containerRef} className={cn("w-full bg-transparent", className)}>
      <div className="flex w-full justify-center overflow-visible">
        <Barcode
          value={encoded}
          format="CODE128"
          width={barWidth}
          height={barHeight}
          displayValue={false}
          margin={BARCODE_QUIET_ZONE}
          background="transparent"
          lineColor={lineColor}
        />
      </div>
      {showValue && (
        <p
          className="mt-1 text-center font-mono text-[8px] tracking-[0.14em]"
          style={{ color: lineColor }}
        >
          {encoded}
        </p>
      )}
    </div>
  );
}
