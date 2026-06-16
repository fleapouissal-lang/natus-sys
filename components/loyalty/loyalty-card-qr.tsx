"use client";

import QRCode from "react-qr-code";

const QUIET_ZONE = 4;

export function LoyaltyCardQr({
  value,
  size = 64,
  fgColor = "#FFFFFF",
  bgColor = "transparent",
  level = "M",
  scanOptimized = false,
}: {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  level?: "L" | "M" | "Q" | "H";
  /** Contraste élevé + zone calme pour lecteurs caisse */
  scanOptimized?: boolean;
}) {
  const quiet = scanOptimized ? QUIET_ZONE : 0;
  const moduleSize = Math.max(32, size - quiet * 2);
  const fg = scanOptimized ? "#000000" : fgColor;
  const bg = scanOptimized ? "#FFFFFF" : bgColor;
  const ecLevel = scanOptimized ? "M" : level;

  return (
    <div
      style={{
        width: size,
        height: size,
        padding: quiet,
        backgroundColor: bg,
        boxSizing: "border-box",
        lineHeight: 0,
        flexShrink: 0,
      }}
    >
      <QRCode
        value={value}
        size={moduleSize}
        level={ecLevel}
        fgColor={fg}
        bgColor={bg}
        style={{
          width: moduleSize,
          height: moduleSize,
          display: "block",
        }}
      />
    </div>
  );
}
