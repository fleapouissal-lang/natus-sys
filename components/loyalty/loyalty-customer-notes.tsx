"use client";

import { MessageSquare } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { CustomerNote } from "@/lib/types";

const SOURCE_LABELS: Record<CustomerNote["source"], string> = {
  shopify_order: "Commande en ligne",
  cashier_follow_up: "Suivi caisse",
  whatsapp: "WhatsApp",
};

export function LoyaltyCustomerNotes({
  notes,
  compact = false,
  className = "",
}: {
  notes: CustomerNote[];
  compact?: boolean;
  className?: string;
}) {
  if (notes.length === 0) return null;

  return (
    <div
      className={`rounded-lg border border-warning/30 bg-warning/5 ${compact ? "p-2.5" : "p-3"} ${className}`}
    >
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        <MessageSquare className="h-4 w-4 text-warning" />
        Notes client ({notes.length})
      </div>
      <ul className={`space-y-2 ${compact ? "max-h-36 overflow-y-auto" : ""}`}>
        {notes.map((note) => (
          <li
            key={note.id}
            className="border-b border-border/60 pb-2 text-sm last:border-b-0 last:pb-0"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>{SOURCE_LABELS[note.source]}</span>
              <span>·</span>
              <span>{formatDate(note.created_at)}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-foreground">{note.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
