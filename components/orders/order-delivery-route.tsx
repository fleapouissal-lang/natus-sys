import { ArrowRight, MapPin, Store } from "lucide-react";
import {
  orderDeliveryDestination,
  orderDeliverySource,
} from "@/lib/shopify/order-delivery-route";
import type { ShopifyOrder } from "@/lib/types";
import { cn } from "@/lib/utils";

export function OrderDeliveryRoute({
  order,
  layout = "stacked",
  className,
}: {
  order: ShopifyOrder;
  layout?: "stacked" | "inline";
  className?: string;
}) {
  const source = orderDeliverySource(order);
  const destination = orderDeliveryDestination(order);

  if (!source && !destination) return null;

  if (layout === "inline") {
    return (
      <p className={cn("text-sm text-foreground/90", className)}>
        {source ? (
          <span className="inline-flex items-center gap-1">
            <Store className="h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden />
            <span className="font-medium">{source}</span>
          </span>
        ) : null}
        {source && destination ? (
          <ArrowRight className="mx-1.5 inline h-3.5 w-3.5 text-muted" aria-hidden />
        ) : null}
        {destination ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden />
            <span>{destination}</span>
          </span>
        ) : null}
      </p>
    );
  }

  return (
    <div className={cn("space-y-1 text-xs", className)}>
      {source ? (
        <p className="flex items-start gap-1.5 text-foreground/90">
          <Store className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden />
          <span>
            <span className="font-medium text-muted">Source ·</span> {source}
          </span>
        </p>
      ) : null}
      {destination ? (
        <p className="flex items-start gap-1.5 text-foreground/90">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden />
          <span>
            <span className="font-medium text-muted">Destination ·</span> {destination}
          </span>
        </p>
      ) : null}
    </div>
  );
}
