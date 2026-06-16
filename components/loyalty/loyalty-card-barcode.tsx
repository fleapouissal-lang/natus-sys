"use client";

import { useLayoutEffect, useRef } from "react";
import Barcode from "react-barcode";
import { cn } from "@/lib/utils";

const CARD_GOLD = "#EBD4BA";

function stretchBarcodeSvg(container: HTMLDivElement, barHeight: number) {
  const svg = container.querySelector("svg");
  if (!svg) return;

  const targetWidth = container.clientWidth;
  const naturalWidth =
    parseFloat(svg.getAttribute("width") ?? "") ||
    svg.getBoundingClientRect().width;
  const naturalHeight =
    parseFloat(svg.getAttribute("height") ?? "") || barHeight;

  if (targetWidth <= 0 || naturalWidth <= 0) return;

  svg.setAttribute("viewBox", `0 0 ${naturalWidth} ${naturalHeight}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.style.display = "block";
  svg.style.width = "100%";
  svg.style.height = `${barHeight}px`;
  svg.style.maxWidth = "100%";
}

export function LoyaltyCardBarcode({
  value,
  compact = false,
  className,
  showValue = false,
}: {
  value: string;
  compact?: boolean;
  className?: string;
  showValue?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const barHeight = compact ? 30 : 36;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const apply = () => stretchBarcodeSvg(container, barHeight);
    apply();

    const observer = new ResizeObserver(apply);
    observer.observe(container);
    return () => observer.disconnect();
  }, [value, barHeight, compact]);

  return (
    <div ref={containerRef} className={cn("w-full bg-transparent", className)}>
      <Barcode
        value={value}
        format="CODE128"
        width={2}
        height={barHeight}
        displayValue={false}
        margin={0}
        background="transparent"
        lineColor={CARD_GOLD}
      />
      {showValue && (
        <p className="mt-1 text-center font-mono text-[7px] tracking-[0.16em] text-[#EBD4BA]/70">
          {value}
        </p>
      )}
    </div>
  );
}
