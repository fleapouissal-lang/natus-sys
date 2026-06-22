"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { getActivityKindLabel } from "@/lib/activity-utils";
import { formatDate } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
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
  descriptionClassName,
  viewAllHref,
  limit = 8,
  paginate = false,
  pageSize = DEFAULT_PAGE_SIZE,
}: {
  activities: ActivityEntry[];
  title?: string;
  description?: string;
  descriptionClassName?: string;
  viewAllHref?: string;
  /** Nombre d’entrées affichées sans pagination (défaut 8). */
  limit?: number;
  /** Active la pagination (10 par page par défaut). */
  paginate?: boolean;
  pageSize?: number;
}) {
  const {
    paginated: pagedActivities,
    page,
    setPage,
    totalPages,
    rangeStart,
    rangeEnd,
    totalItems,
  } = usePagination(activities, pageSize);

  const recent = paginate ? pagedActivities : activities.slice(0, limit);

  return (
    <Card padding={false}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-6">
        <CardHeader
          title={title}
          description={description}
          descriptionClassName={descriptionClassName}
        />
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
        <p className="px-4 pb-8 text-sm text-muted md:px-6">Aucune action enregistrée</p>
      ) : (
        <>
          <ul className="hidden divide-y divide-border md:block">
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
          <ul className="space-y-2 px-3 pb-4 md:hidden">
            {recent.map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl border border-primary/15 bg-surface p-3 shadow-[0_2px_12px_rgba(179,140,74,0.06)]"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <Badge variant={kindVariant(entry.kind)} className="text-[10px]">
                    {getActivityKindLabel(entry.kind)}
                  </Badge>
                  <span className="shrink-0 text-[10px] text-muted">
                    {formatDate(entry.created_at)}
                  </span>
                </div>
                <p className="text-sm font-semibold">{entry.title}</p>
                {entry.detail ? <p className="mt-0.5 text-xs text-muted">{entry.detail}</p> : null}
                <p className="mt-1.5 text-[11px] text-muted">
                  {entry.actor_name || "—"}
                  {entry.store_name ? ` · ${entry.store_name}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
      {paginate && activities.length > 0 && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          totalItems={totalItems}
          onPageChange={setPage}
        />
      )}
    </Card>
  );
}
