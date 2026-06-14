"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { syncShopifyOrders } from "@/lib/actions";
import { Button } from "@/components/ui/button";

export function ShopifySyncButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSync() {
    setMessage(null);
    startTransition(async () => {
      const result = await syncShopifyOrders();
      if ("error" in result) {
        setMessage(result.error);
      } else {
        setMessage(`${result.synced} synchronisée(s)${result.failed ? `, ${result.failed} échec(s)` : ""}`);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
      {message && (
        <p className="text-sm text-muted">{message}</p>
      )}
      <Button onClick={handleSync} disabled={pending} className="gap-2">
        <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Synchronisation…" : "Sync Shopify"}
      </Button>
    </div>
  );
}
