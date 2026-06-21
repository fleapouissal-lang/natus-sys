"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  formatOrderAgeShort,
  orderAgeBadgeTitle,
  orderAgeUrgency,
  ORDER_AGE_BADGE_STYLES,
} from "@/lib/shopify/order-age-urgency";

export function OrderAgeBadge({
  createdAt,
  className,
}: {
  createdAt: string;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const urgency = orderAgeUrgency(createdAt, now);
  const style = ORDER_AGE_BADGE_STYLES[urgency];
  const label = formatOrderAgeShort(createdAt, now);

  return (
    <span
      title={orderAgeBadgeTitle(createdAt, now)}
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none",
        style.className,
        className
      )}
    >
      {label}
    </span>
  );
}
