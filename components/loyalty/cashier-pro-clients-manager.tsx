"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BriefcaseBusiness, ExternalLink, Eye, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilterTogglePanel } from "@/components/ui/filter-toggle-panel";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { LoyaltyWalletCard } from "@/components/loyalty/loyalty-wallet-card";
import { ProClientQrButton } from "@/components/pro-client/pro-client-qr-modal";
import { Modal } from "@/components/ui/modal";
import { PRO_CLIENT_DISCOUNT_PERCENT } from "@/lib/pro-client/discount";
import { formatDate } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/loyalty/phone";
import { sortProClientsByFidelity } from "@/lib/loyalty/sort-customers";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import { customerRegisteredAtStore } from "@/lib/loyalty/customer-store-scope";
import { customerCardUrl } from "@/lib/loyalty/qr";
import type { LoyaltyCustomer } from "@/lib/types";

export function CashierProClientsManager({
  customers,
  storeId,
  storeName,
}: {
  customers: LoyaltyCustomer[];
  storeId?: string | null;
  storeName?: string;
}) {
  const [search, setSearch] = useState("");
  const [detailCustomer, setDetailCustomer] = useState<LoyaltyCustomer | null>(null);

  const pendingCount = customers.filter((c) => !c.pro_client_active).length;
  const activeCount = customers.filter((c) => c.pro_client_active).length;

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

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-muted">Clients Pro actifs</p>
          <p className="mt-1 text-2xl font-bold text-primary">{activeCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">En attente d&apos;activation</p>
          <p className="mt-1 text-2xl font-bold text-warning">{pendingCount}</p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Remise automatique de {PRO_CLIENT_DISCOUNT_PERCENT}% en caisse — pas de points fidélité
        </p>
        {storeId && (
          <ProClientQrButton storeId={storeId} storeName={storeName} />
        )}
      </div>

      <FilterTogglePanel
        toggleLabel="Filtrer les clients"
        summary={`${filtered.length} client${filtered.length !== 1 ? "s" : ""}`}
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-primary-light/50">
                <th className="px-6 py-3 text-left font-medium text-muted">Client</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Type</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Carte</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Statut</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Inscrit le</th>
                <th className="px-6 py-3 text-right font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((customer) => {
                const isActive = Boolean(customer.pro_client_active);
                const isEntreprise = customer.pro_client_type === "entreprise";
                return (
                  <tr key={customer.id} className="border-b border-border last:border-b-0">
                    <td className="px-6 py-4">
                      <p className="font-medium">{customer.full_name}</p>
                      <p className="text-xs text-muted">{formatPhoneDisplay(customer.phone)}</p>
                      {customer.stores?.name && (
                        <p className="text-xs text-muted">{customer.stores.name}</p>
                      )}
                      {storeId && (
                        <Badge
                          variant={
                            customerRegisteredAtStore(customer, storeId) ? "default" : "accent"
                          }
                          className="mt-1"
                        >
                          {customerRegisteredAtStore(customer, storeId)
                            ? "Inscrit ici"
                            : "A acheté ici"}
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={isEntreprise ? "default" : "accent"}>
                        {isEntreprise ? "Professionnel" : "Particulier"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-mono">{customer.card_number}</td>
                    <td className="px-6 py-4">
                      <Badge variant={isActive ? "success" : "warning"}>
                        {isActive ? `Actif · -${PRO_CLIENT_DISCOUNT_PERCENT}%` : "En attente"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted">{formatDate(customer.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title="Voir la carte"
                          onClick={() => setDetailCustomer(customer)}
                          className="order-action-icon flex h-8 w-8 items-center justify-center border border-primary/30 bg-page text-primary hover:bg-primary-light cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <Link
                          href={customerCardUrl(customer.qr_token, true)}
                          target="_blank"
                          title="Ouvrir la carte client"
                          className="order-action-icon flex h-8 w-8 items-center justify-center border border-primary/30 bg-page text-primary hover:bg-primary-light"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                        {customer.pro_client_type === "particulier" && (
                          <Link
                            href={`${customerCardUrl(customer.qr_token, true)}?tab=commandes`}
                            target="_blank"
                            title="Voir les commandes"
                            className="order-action-icon flex h-8 w-8 items-center justify-center border border-primary/30 bg-page text-primary hover:bg-primary-light"
                          >
                            <BriefcaseBusiness className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted">
                    {customers.length === 0
                      ? "Aucun client Pro pour ce magasin"
                      : "Aucun résultat pour cette recherche"}
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

      {detailCustomer && (
        <Modal onClose={() => setDetailCustomer(null)} size="md">
          <div className="mb-4 flex items-center gap-2">
            <BriefcaseBusiness className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Carte Client Pro</h3>
          </div>
          <LoyaltyWalletCard customer={detailCustomer} compact />
          <p className="mt-4 text-sm text-muted">
            {detailCustomer.pro_client_active
              ? `Remise de ${PRO_CLIENT_DISCOUNT_PERCENT}% en caisse — pas de points`
              : "Compte en attente d'activation par le directeur"}
          </p>
        </Modal>
      )}
    </>
  );
}
