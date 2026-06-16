"use client";

import QRCode from "react-qr-code";

export function LoyaltyCardQr({
  value,
  size = 64,
}: {
  value: string;
  size?: number;
}) {
  return (
    <QRCode
      value={value}
      size={size}
      level="M"
      fgColor="#FFFFFF"
      bgColor="transparent"
      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
    />
  );
}
