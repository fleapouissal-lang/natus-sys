"use client";

import { useTransition } from "react";
import { Phone, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/loyalty/phone";
import { resolveStoreComplaint } from "@/lib/actions";
import type { StoreComplaint } from "@/lib/feedback/complaints";

const SOURCE_LABELS: Record<StoreComplaint["source"], string> = {
  shopify_delivery: "Livraison Shopify",
  pos_sale: "Achat magasin",
};

export function StoreComplaintsList({
  complaints,
  canResolve = true,
}: {
  complaints: StoreComplaint[];
  canResolve?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (complaints.length === 0) {
    return (
      <Card className="px-6 py-12 text-center text-muted">
        Aucune réclamation client pour le moment.
      </Card>
    );
  }

  function handleResolve(id: string) {
    startTransition(async () => {
      await resolveStoreComplaint(id);
    });
  }

  return (
    <div className="space-y-3">
      {complaints.map((complaint) => (
        <Card key={complaint.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 font-heading text-base font-semibold text-foreground">
                  <AlertTriangle className="h-4 w-4 text-danger" />
                  Réclamation
                </span>
                <Badge variant={complaint.status === "new" ? "danger" : "success"}>
                  {complaint.status === "new" ? "Nouvelle" : "Traitée"}
                </Badge>
                <Badge variant="secondary">{SOURCE_LABELS[complaint.source]}</Badge>
              </div>

              <p className="mt-2 text-sm text-foreground">{complaint.message}</p>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                {complaint.customer_name && (
                  <span className="text-muted">{complaint.customer_name}</span>
                )}
                <a
                  href={`tel:${complaint.customer_phone.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <Phone className="h-3 w-3" />
                  {formatPhoneDisplay(complaint.customer_phone)}
                </a>
              </div>

              <p className="mt-2 text-xs text-muted">
                {complaint.stores?.name || "Magasin"}
                {complaint.shopify_orders?.order_number
                  ? ` — ${complaint.shopify_orders.order_number}`
                  : ""}
                {" · "}
                {formatDate(complaint.created_at)}
              </p>
            </div>

            {canResolve && complaint.status === "new" && (
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                disabled={pending}
                onClick={() => handleResolve(complaint.id)}
              >
                <CheckCircle2 className="h-4 w-4" />
                Marquer traitée
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
