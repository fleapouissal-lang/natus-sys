"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { getActivityKindLabel } from "@/lib/activity-utils";
import { formatDate } from "@/lib/utils";
import type { ActivityEntry } from "@/lib/types";

function kindVariant(
  kind: ActivityEntry["kind"]
): "success" | "warning" | "default" | "accent" {
  switch (kind) {
    case "stock_add":
    case "stock_transfer_in":
      return "success";
    case "stock_adjustment":
      return "warning";
    case "stock_transfer_out":
      return "accent";
    case "sale":
      return "default";
  }
}

export function RecentActivityPanel({
  activities,
  title = "Activité récente",
  description,
  viewAllHref,
  limit = 8,
}: {
  activities: ActivityEntry[];
  title?: string;
  description?: string;
  viewAllHref?: string;
  limit?: number;
}) {
  const recent = activities.slice(0, limit);

  return (
    <Card padding={false}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-6">
        <CardHeader title={title} description={description} />
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Voir tout
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {recent.length === 0 ? (
        <p className="px-6 pb-8 text-sm text-muted">Aucune action enregistrée</p>
      ) : (
        <ul className="divide-y divide-border">
          {recent.map((entry) => (
            <li key={entry.id} className="flex items-start justify-between gap-4 px-6 py-4">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge variant={kindVariant(entry.kind)}>
                    {getActivityKindLabel(entry.kind)}
                  </Badge>
                  {entry.store_name && (
                    <span className="text-xs text-muted">{entry.store_name}</span>
                  )}
                </div>
                <p className="font-medium">{entry.title}</p>
                {entry.detail && <p className="text-xs text-muted">{entry.detail}</p>}
                <p className="mt-1 text-xs text-muted">
                  {entry.actor_name || "—"}
                  {entry.actor_role === "hub" ? " · Hub stock" : ""}
                </p>
              </div>
              <p className="shrink-0 text-xs text-muted whitespace-nowrap">
                {formatDate(entry.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
