"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BriefcaseBusiness, Eye, Search, Trash2, UserCheck, UserX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterTogglePanel } from "@/components/ui/filter-toggle-panel";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { deleteProClientCustomer, toggleProClientActive } from "@/lib/actions";
import { formatDate } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/loyalty/phone";
import { sortProClientsByFidelity } from "@/lib/loyalty/sort-customers";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { LoyaltyCustomer } from "@/lib/types";

export function ProClientsManager({
  customers,
  detailBasePath,
}: {
  customers: LoyaltyCustomer[];
  detailBasePath: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const pendingCount = customers.filter((c) => !c.pro_client_active).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = !q
      ? customers
      : customers.filter(
          (c) =>
            c.full_name.toLowerCase().includes(q) ||
            c.phone.includes(q) ||
            c.card_number.toLowerCase().includes(q) ||
            (c.email?.toLowerCase().includes(q) ?? false) ||
            (c.company_name?.toLowerCase().includes(q) ?? false)
        );
    return sortProClientsByFidelity(list);
  }, [customers, search]);

  const {
    paginated,
    page,
    setPage,
    totalPages,
    rangeStart,
    rangeEnd,
    totalItems,
  } = usePagination(filtered, DEFAULT_PAGE_SIZE, search);

  function runAction(customerId: string, action: () => Promise<{ error?: string } | { success: true }>) {
    setLoadingId(customerId);
    startTransition(async () => {
      const result = await action();
      if ("error" in result && result.error) {
        window.alert(result.error);
      } else {
        router.refresh();
      }
      setLoadingId(null);
    });
  }

  function handleActivate(customerId: string) {
    runAction(customerId, () => toggleProClientActive(customerId, true));
  }

  function handleDeactivate(customerId: string, label: string) {
    if (!window.confirm(`Désactiver le compte Client Pro de ${label} ?`)) return;
    runAction(customerId, () => toggleProClientActive(customerId, false));
  }

  function handleDelete(customerId: string, label: string) {
    if (
      !window.confirm(
        `Supprimer définitivement ${label} ?\n\nSi le client a de l'historique de ventes, la suppression échouera.`
      )
    ) {
      return;
    }
    runAction(customerId, () => deleteProClientCustomer(customerId));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {customers.length} compte{customers.length !== 1 ? "s" : ""} pro · {pendingCount} en attente
        d&apos;activation
      </p>

      <FilterTogglePanel
        toggleLabel="Filtrer les clients"
        summary={`${filtered.length} résultat${filtered.length !== 1 ? "s" : ""}`}
      >
        <div className="natus-filter-bar overflow-visible p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom, entreprise, téléphone, carte…"
              className="natus-field w-full bg-surface py-0 pl-10 pr-3 text-sm"
            />
          </div>
        </div>
      </FilterTogglePanel>

      <Card padding={false}>
        <div className="border-b border-border px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <BriefcaseBusiness className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Comptes Client Pro</h2>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-border bg-primary-light/40">
                <th className="px-6 py-3 text-left font-medium text-muted">Client</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Type</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Entreprise / Ville</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Carte</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Statut</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Inscrit le</th>
                <th className="px-6 py-3 text-right font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((customer) => {
                const label = customer.full_name || customer.phone;
                const isActive = Boolean(customer.pro_client_active);
                const isEntreprise = customer.pro_client_type === "entreprise";
                return (
                  <tr key={customer.id} className="border-b border-border last:border-b-0">
                    <td className="px-6 py-4">
                      <p className="font-medium">{customer.full_name}</p>
                      <p className="text-xs text-muted">{formatPhoneDisplay(customer.phone)}</p>
                      {customer.address && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted">{customer.address}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={isEntreprise ? "default" : "accent"}>
                        {isEntreprise ? "Professionnel" : "Particulier"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted">
                      {isEntreprise ? (
                        <>
                          <p>{customer.company_name || "—"}</p>
                          <p className="text-xs">{customer.city || "—"}</p>
                          {customer.responsible_name && (
                            <p className="text-xs text-muted">
                              Resp. {customer.responsible_name}
                            </p>
                          )}
                          {(customer.company_ice || customer.company_rc) && (
                            <p className="text-xs text-muted">
                              {[customer.company_ice && `ICE ${customer.company_ice}`, customer.company_rc && `RC ${customer.company_rc}`]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </>
                      ) : (
                        <span>{customer.city || customer.email || "—"}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono">{customer.card_number}</td>
                    <td className="px-6 py-4">
                      <Badge variant={isActive ? "success" : "warning"}>
                        {isActive ? "Actif" : "En attente"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted">{formatDate(customer.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`${detailBasePath}/${customer.id}`}
                          title="Voir la fiche"
                          className="order-action-icon flex h-8 w-8 items-center justify-center border border-primary/30 bg-page text-primary hover:bg-primary-light"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        {!isActive ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            loading={pending && loadingId === customer.id}
                            onClick={() => handleActivate(customer.id)}
                            title="Activer"
                          >
                            <UserCheck className="h-4 w-4 text-success" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            loading={pending && loadingId === customer.id}
                            onClick={() => handleDeactivate(customer.id, label)}
                            title="Désactiver"
                          >
                            <UserX className="h-4 w-4 text-warning" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          loading={pending && loadingId === customer.id}
                          onClick={() => handleDelete(customer.id, label)}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted">
                    Aucun compte Client Pro trouvé
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
