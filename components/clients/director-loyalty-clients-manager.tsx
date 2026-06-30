"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Search, Trash2, UserCheck, UserPlus, UserX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterTogglePanel } from "@/components/ui/filter-toggle-panel";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { LoyaltyTierBadge } from "@/components/loyalty/loyalty-tier-badge";
import { loyaltyTierFromPoints } from "@/lib/loyalty/tiers";
import {
  deleteLoyaltyCustomer,
  toggleLoyaltyCustomerActive,
} from "@/lib/actions";
import { formatDate } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/loyalty/phone";
import { sortLoyaltyCustomersByFidelity } from "@/lib/loyalty/sort-customers";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import { CreateLoyaltyCustomerModal } from "@/components/loyalty/create-customer-modal";
import { CustomersCsvActions } from "@/components/clients/customers-csv-actions";
import type { LoyaltyCustomer } from "@/lib/types";

export function DirectorLoyaltyClientsManager({
  clients,
  detailBasePath,
}: {
  clients: LoyaltyCustomer[];
  detailBasePath: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [pending, startTransition] = useTransition();

  const inactiveCount = clients.filter((c) => c.is_active === false).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = !q
      ? clients
      : clients.filter(
          (c) =>
            c.full_name.toLowerCase().includes(q) ||
            c.phone.includes(q) ||
            c.card_number.toLowerCase().includes(q) ||
            (c.email?.toLowerCase().includes(q) ?? false)
        );
    return sortLoyaltyCustomersByFidelity(list);
  }, [clients, search]);

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

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {clients.length} carte{clients.length !== 1 ? "s" : ""} fidélité standard — points uniquement, sans
        remise Pro
        {inactiveCount > 0
          ? ` · ${inactiveCount} désactivée${inactiveCount !== 1 ? "s" : ""}`
          : ""}
      </p>

      <FilterTogglePanel
        toggleLabel="Filtrer les clients"
        summary={`${filtered.length} résultat${filtered.length !== 1 ? "s" : ""}`}
      >
        <div className="natus-filter-bar overflow-visible p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative max-w-md flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nom, téléphone, carte FID…"
                className="natus-field w-full bg-surface py-0 pl-10 pr-3 text-sm"
              />
            </div>
            <Button type="button" onClick={() => setShowCreate(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Nouveau client
            </Button>
            <CustomersCsvActions
              kind="loyalty"
              exportRows={filtered}
              onImported={() => router.refresh()}
            />
          </div>
        </div>
      </FilterTogglePanel>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-border bg-primary-light/40">
                <th className="px-6 py-3 text-left font-medium text-muted">Client</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Carte</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Statut</th>
                <th className="px-6 py-3 text-right font-medium text-muted">Points</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Adhésion</th>
                <th className="px-6 py-3 text-right font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((customer) => {
                const tier = loyaltyTierFromPoints(customer.loyalty_points);
                const isActive = customer.is_active !== false;
                const label = customer.full_name || customer.phone;
                return (
                  <tr key={customer.id} className="border-b border-border last:border-b-0">
                    <td className="px-6 py-4">
                      <p className="font-medium">{customer.full_name}</p>
                      <p className="text-xs text-muted">{formatPhoneDisplay(customer.phone)}</p>
                    </td>
                    <td className="px-6 py-4 font-mono">{customer.card_number}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <LoyaltyTierBadge tier={tier} />
                        {!isActive && <Badge variant="warning">Désactivé</Badge>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-primary">
                      {customer.loyalty_points}
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
                        {isActive ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            loading={pending && loadingId === customer.id}
                            onClick={() => {
                              if (!window.confirm(`Désactiver le client ${label} ?`)) return;
                              runAction(customer.id, () =>
                                toggleLoyaltyCustomerActive(customer.id, false)
                              );
                            }}
                            title="Désactiver"
                          >
                            <UserX className="h-4 w-4 text-warning" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            loading={pending && loadingId === customer.id}
                            onClick={() =>
                              runAction(customer.id, () =>
                                toggleLoyaltyCustomerActive(customer.id, true)
                              )
                            }
                            title="Réactiver"
                          >
                            <UserCheck className="h-4 w-4 text-success" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          loading={pending && loadingId === customer.id}
                          onClick={() => {
                            if (
                              !window.confirm(
                                `Supprimer définitivement ${label} ?\n\nSi le client a de l'historique de ventes, la suppression échouera.`
                              )
                            ) {
                              return;
                            }
                            runAction(customer.id, () => deleteLoyaltyCustomer(customer.id));
                          }}
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
                  <td colSpan={6} className="px-6 py-12 text-center text-muted">
                    Aucun client fidélité trouvé
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

      {showCreate && (
        <CreateLoyaltyCustomerModal
          onClose={() => setShowCreate(false)}
          onCreated={(customer) => {
            setShowCreate(false);
            window.alert(
              `Carte fidélité créée (${customer.card_number}).\n\n${customer.full_name} — ${customer.loyalty_points} point(s).`
            );
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
