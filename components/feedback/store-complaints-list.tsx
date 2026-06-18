"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Phone, CheckCircle2, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SelectMenu } from "@/components/ui/select-menu";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { formatDate } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/loyalty/phone";
import { resolveStoreComplaint } from "@/lib/actions";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { StoreComplaint } from "@/lib/feedback/complaints";

const SOURCE_LABELS: Record<StoreComplaint["source"], string> = {
  shopify_delivery: "Livraison Shopify",
  pos_sale: "Achat magasin",
};

const STATUS_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  { value: "new", label: "Nouvelles" },
  { value: "resolved", label: "Traitées" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "Toutes les sources" },
  { value: "shopify_delivery", label: "Livraison Shopify" },
  { value: "pos_sale", label: "Achat magasin" },
];

export function StoreComplaintsList({
  complaints,
  canResolve = true,
  showStoreColumn = true,
}: {
  complaints: StoreComplaint[];
  canResolve?: boolean;
  showStoreColumn?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");

  const storeOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const c of complaints) {
      if (c.store_id && c.stores?.name) {
        byId.set(c.store_id, c.stores.name);
      }
    }
    return [
      { value: "", label: "Tous les magasins" },
      ...[...byId.entries()]
        .sort((a, b) => a[1].localeCompare(b[1], "fr"))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [complaints]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return complaints.filter((complaint) => {
      if (statusFilter && complaint.status !== statusFilter) return false;
      if (sourceFilter && complaint.source !== sourceFilter) return false;
      if (storeFilter && complaint.store_id !== storeFilter) return false;
      if (!q) return true;
      return (
        complaint.message.toLowerCase().includes(q) ||
        (complaint.customer_name?.toLowerCase().includes(q) ?? false) ||
        complaint.customer_phone.includes(q) ||
        (complaint.stores?.name?.toLowerCase().includes(q) ?? false) ||
        (complaint.shopify_orders?.order_number?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [complaints, search, statusFilter, sourceFilter, storeFilter]);

  const filterToken = `${search}|${statusFilter}|${sourceFilter}|${storeFilter}`;
  const {
    paginated,
    page,
    setPage,
    totalPages,
    rangeStart,
    rangeEnd,
    totalItems,
  } = usePagination(filtered, DEFAULT_PAGE_SIZE, filterToken);

  const hasFilters = Boolean(search || statusFilter || sourceFilter || storeFilter);

  function resetFilters() {
    setSearch("");
    setStatusFilter("");
    setSourceFilter("");
    setStoreFilter("");
  }

  function handleResolve(id: string) {
    startTransition(async () => {
      await resolveStoreComplaint(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="natus-filter-bar overflow-visible p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-primary">Filtrer les réclamations</p>
          <div className="flex items-center gap-3">
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="cursor-pointer text-xs font-medium text-primary underline-offset-2 hover:underline"
              >
                Tout effacer
              </button>
            )}
            <p className="text-sm text-muted">
              <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
              réclamation{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="mb-1.5 block text-sm font-medium">Rechercher</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Client, téléphone, message…"
                className="natus-field w-full bg-surface py-0 pl-10 pr-3 text-sm"
              />
            </div>
          </div>
          <SelectMenu
            label="Statut"
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
            size="sm"
          />
          <SelectMenu
            label="Source"
            value={sourceFilter}
            onChange={setSourceFilter}
            options={SOURCE_OPTIONS}
            size="sm"
          />
          {showStoreColumn && storeOptions.length > 2 && (
            <SelectMenu
              label="Magasin"
              value={storeFilter}
              onChange={setStoreFilter}
              options={storeOptions}
              size="sm"
            />
          )}
        </div>
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-primary-light/50">
                <th className="px-6 py-3 text-left font-medium text-muted">Date</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Statut</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Source</th>
                {showStoreColumn && (
                  <th className="px-6 py-3 text-left font-medium text-muted">Magasin</th>
                )}
                <th className="px-6 py-3 text-left font-medium text-muted">Client</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Message</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Réf.</th>
                {canResolve && (
                  <th className="px-6 py-3 text-right font-medium text-muted">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginated.map((complaint) => (
                <tr key={complaint.id} className="border-b border-border last:border-b-0">
                  <td className="px-6 py-4 whitespace-nowrap text-muted">
                    {formatDate(complaint.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={complaint.status === "new" ? "danger" : "success"}>
                      {complaint.status === "new" ? "Nouvelle" : "Traitée"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="default">{SOURCE_LABELS[complaint.source]}</Badge>
                  </td>
                  {showStoreColumn && (
                    <td className="px-6 py-4 whitespace-nowrap text-foreground">
                      {complaint.stores?.name || "—"}
                    </td>
                  )}
                  <td className="px-6 py-4">
                    {complaint.customer_name && (
                      <p className="font-medium text-foreground">{complaint.customer_name}</p>
                    )}
                    <a
                      href={`tel:${complaint.customer_phone.replace(/\s/g, "")}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <Phone className="h-3 w-3" />
                      {formatPhoneDisplay(complaint.customer_phone)}
                    </a>
                  </td>
                  <td className="max-w-xs px-6 py-4">
                    <p className="line-clamp-2 text-foreground" title={complaint.message}>
                      {complaint.message}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-muted">
                    {complaint.shopify_orders?.order_number || "—"}
                  </td>
                  {canResolve && (
                    <td className="px-6 py-4">
                      <div className="flex justify-end">
                        {complaint.status === "new" ? (
                          <Button
                            type="button"
                            size="sm"
                            className="gap-1.5"
                            disabled={pending}
                            onClick={() => handleResolve(complaint.id)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Traiter
                          </Button>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td
                    colSpan={
                      (showStoreColumn ? 1 : 0) + (canResolve ? 1 : 0) + 6
                    }
                    className="px-6 py-12 text-center text-muted"
                  >
                    {complaints.length === 0
                      ? "Aucune réclamation client pour le moment."
                      : "Aucune réclamation ne correspond aux filtres."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
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
    </div>
  );
}
