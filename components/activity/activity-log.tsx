"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { SelectMenu } from "@/components/ui/select-menu";
import { activityRoleOptions, activityTypeOptions } from "@/lib/select-options";
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

  const hasFilters = Boolean(search || typeFilter || roleFilter);

  function resetFilters() {
    setSearch("");
    setTypeFilter("");
    setRoleFilter("");
  }

  return (
    <div className="space-y-6">
      <div className="natus-filter-bar overflow-visible p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-primary">Filtrer l&apos;activité</p>
          <div className="flex items-center gap-3">
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-medium text-primary underline-offset-2 hover:underline cursor-pointer"
              >
                Tout effacer
              </button>
            )}
            <p className="text-sm text-muted">
              <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
              action{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:items-end">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Rechercher</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Action, utilisateur, magasin..."
                className="natus-field w-full bg-surface py-0 pl-10 pr-3 text-sm"
              />
            </div>
          </div>
          <SelectMenu
            label="Type"
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as "" | ActivityKind)}
            options={activityTypeOptions(TYPE_OPTIONS)}
            size="sm"
          />
          <SelectMenu
            label="Rôle"
            value={roleFilter}
            onChange={(v) => setRoleFilter(v as "" | UserRole)}
            options={activityRoleOptions(ROLE_OPTIONS)}
            size="sm"
          />
        </div>
      </div>

      <Card padding={false}>
        <div className="p-6">
          <CardHeader
            title="Journal d'activité"
            description={scopeLabel}
          />
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatDate(entry.created_at)}
                  </td>
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
    </div>
  );
}
