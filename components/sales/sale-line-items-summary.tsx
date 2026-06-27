import { saleLineItems } from "@/lib/sales/day-closure";
import { cn } from "@/lib/utils";
import type { Sale } from "@/lib/types";

export function SaleLineItemsSummary({
  sale,
  variant = "stack",
  maxItems = 8,
  className,
}: {
  sale: Pick<Sale, "sale_items">;
  variant?: "stack" | "inline" | "compact";
  maxItems?: number;
  className?: string;
}) {
  const items = saleLineItems(sale);
  if (items.length === 0) {
    return <span className={cn("text-muted", className)}>—</span>;
  }

  const visible = items.slice(0, maxItems);
  const extra = items.length - visible.length;

  if (variant === "inline") {
    return (
      <span className={cn("text-[11px] leading-snug text-foreground/90", className)}>
        {visible.map((item, index) => (
          <span key={`${item.name}-${index}`}>
            {index > 0 ? " · " : null}
            <span className="font-medium">{item.name}</span>
            <span className="font-semibold tabular-nums"> ×{item.quantity}</span>
          </span>
        ))}
        {extra > 0 ? (
          <span className="text-muted"> · +{extra} autre{extra > 1 ? "s" : ""}</span>
        ) : null}
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <ul className={cn("space-y-0.5 text-[10px] leading-snug", className)}>
        {visible.map((item, index) => (
          <li key={`${item.name}-${index}`} className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate font-medium">{item.name}</span>
            <span className="shrink-0 font-bold tabular-nums">×{item.quantity}</span>
          </li>
        ))}
        {extra > 0 ? (
          <li className="text-muted">+{extra} autre{extra > 1 ? "s" : ""}</li>
        ) : null}
      </ul>
    );
  }

  return (
    <ul className={cn("space-y-0.5 text-[11px] leading-snug", className)}>
      {visible.map((item, index) => (
        <li key={`${item.name}-${index}`}>
          <span className="font-medium">{item.name}</span>
          <span className="font-semibold tabular-nums"> ×{item.quantity}</span>
        </li>
      ))}
      {extra > 0 ? (
        <li className="text-[10px] text-muted">+{extra} autre{extra > 1 ? "s" : ""}</li>
      ) : null}
    </ul>
  );
}
