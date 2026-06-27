import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function CashierReturnsTabs({
  activeTab,
  writeoffsContent,
  shopifyContent,
}: {
  activeTab: "writeoffs" | "shopify";
  writeoffsContent: ReactNode;
  shopifyContent: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/cashier/returns"
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "writeoffs"
              ? "border-primary bg-champagne/50 text-foreground"
              : "border-border bg-surface text-muted hover:border-primary/40"
          )}
        >
          Périmé / cassé
        </Link>
        <Link
          href="/cashier/returns?tab=shopify"
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "shopify"
              ? "border-primary bg-champagne/50 text-foreground"
              : "border-border bg-surface text-muted hover:border-primary/40"
          )}
        >
          Commandes Shopify
        </Link>
      </div>
      {activeTab === "shopify" ? shopifyContent : writeoffsContent}
    </div>
  );
}
