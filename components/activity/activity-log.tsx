"use client";

import { useMemo, useState } from "react";
import { Search, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { selectClassName } from "@/components/ui/select";
import {
  getActivityKindLabel,
  getActorRoleLabel,
} from "@/lib/activity-utils";
import { formatDate } from "@/lib/utils";
import type { ActivityEntry, ActivityKind, UserRole } from "@/lib/types";

function kindVariant(kind: ActivityKind): "success" | "warning" | "default" {
  switch (kind) {
    case "stock_add":
      return "success";
    case "stock_adjustment":
      return "warning";
    case "sale":
      return "default";
  }
}

function formatQuantity(entry: ActivityEntry): string {
  if (entry.quantity === null) return "—";
  if (entry.kind === "sale") return `${Math.abs(entry.quantity)} vendu(s)`;
  const sign = entry.quantity > 0 ? "+" : "";
  return `${sign}${entry.quantity}`;
}

const TYPE_OPTIONS: { value: "" | ActivityKind; label: string }[] = [
  { value: "", label: "Tous les types" },
  { value: "stock_add", label: "Ajout stock" },
  { value: "stock_adjustment", label: "Ajustement" },
  { value: "sale", label: "Vente" },
];

const ROLE_OPTIONS: { value: "" | UserRole; label: string }[] = [
  { value: "", label: "Tous les rôles" },
  { value: "directeur", label: "Directeur" },
  { value: "manager", label: "Gérant" },
  { value: "cashier", label: "Caissier" },
];

export function ActivityLog({
  activities,
  scopeLabel,
  showStoreColumn = false,
}: {
  activities: ActivityEntry[];
  scopeLabel: string;
  showStoreColumn?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | ActivityKind>("");
  const [roleFilter, setRoleFilter] = useState<"" | UserRole>("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activities.filter((entry) => {
      if (typeFilter && entry.kind !== typeFilter) return false;
      if (roleFilter && entry.actor_role !== roleFilter) return false;
      if (!q) return true;
      return (
        entry.title.toLowerCase().includes(q) ||
        (entry.detail?.toLowerCase().includes(q) ?? false) ||
        (entry.actor_name?.toLowerCase().includes(q) ?? false) ||
        (entry.store_name?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [activities, search, typeFilter, roleFilter]);

  return (
    <Card padding={false}>
      <div className="p-6 space-y-4">
        <CardHeader
          title="Journal d'activité"
          description={`${scopeLabel} — ${filtered.length} action(s) affichée(s)`}
        />

        <div className="rounded-lg border border-border bg-background p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
            <Filter className="h-4 w-4" />
            Filtrer
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="relative lg:col-span-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher action, utilisateur..."
                className="w-full border border-border bg-surface py-2 pl-10 pr-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "" | ActivityKind)}
              className={selectClassName}
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as "" | UserRole)}
              className={selectClassName}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-natus max-h-[520px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-primary-light/80 backdrop-blur-sm">
            <tr className="border-y border-border">
              <th className="px-6 py-3 text-left font-medium text-muted">Date</th>
              <th className="px-6 py-3 text-left font-medium text-muted">Type</th>
              <th className="px-6 py-3 text-left font-medium text-muted">Action</th>
              <th className="px-6 py-3 text-left font-medium text-muted">Utilisateur</th>
              {showStoreColumn && (
                <th className="px-6 py-3 text-left font-medium text-muted">Magasin</th>
              )}
              <th className="px-6 py-3 text-right font-medium text-muted">Qté</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => (
              <tr key={entry.id} className="border-b border-border">
                <td className="px-6 py-4 whitespace-nowrap">{formatDate(entry.created_at)}</td>
                <td className="px-6 py-4">
                  <Badge variant={kindVariant(entry.kind)}>
                    {getActivityKindLabel(entry.kind)}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium">{entry.title}</p>
                  {entry.detail && (
                    <p className="text-xs text-muted">{entry.detail}</p>
                  )}
                </td>
                <td className="px-6 py-4">
                  <p>{entry.actor_name || "—"}</p>
                  <p className="text-xs text-muted">
                    {getActorRoleLabel(entry.actor_role)}
                  </p>
                </td>
                {showStoreColumn && (
                  <td className="px-6 py-4">
                    <p>{entry.store_name || "—"}</p>
                    {entry.store_city && (
                      <p className="text-xs text-muted">{entry.store_city}</p>
                    )}
                  </td>
                )}
                <td className="px-6 py-4 text-right font-medium">
                  {formatQuantity(entry)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={showStoreColumn ? 6 : 5}
                  className="px-6 py-12 text-center text-muted"
                >
                  Aucune activité pour ces filtres
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
