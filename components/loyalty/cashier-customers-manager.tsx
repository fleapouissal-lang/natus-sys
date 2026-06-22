"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, UserPlus, ExternalLink, Eye, Gift } from "lucide-react";
import { Card } from "@/components/ui/card";
import { FilterTogglePanel } from "@/components/ui/filter-toggle-panel";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { LoyaltyWalletCard } from "@/components/loyalty/loyalty-wallet-card";
import { LoyaltyCardQrForCashier } from "@/components/loyalty/loyalty-card-client-view";
import { CreateLoyaltyCustomerModal } from "@/components/loyalty/create-customer-modal";
import { loyaltyTierFromPoints } from "@/lib/loyalty/tiers";
import { LoyaltyTierBadge } from "@/components/loyalty/loyalty-tier-badge";
import { loyaltyCardPublicUrl } from "@/lib/loyalty/qr";
import { formatDate, formatCurrency } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/loyalty/phone";
import type { LoyaltyCustomer } from "@/lib/types";

export function CashierCustomersManager({
  customers: initialCustomers,
  storeId,
}: {
  customers: LoyaltyCustomer[];
  storeId?: string | null;
}) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<LoyaltyCustomer | null>(null);
  const [qrCustomer, setQrCustomer] = useState<LoyaltyCustomer | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.card_number.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false)
    );
  }, [customers, search]);

  const totalPoints = customers.reduce((sum, c) => sum + c.loyalty_points, 0);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-muted">Clients fidélité</p>
          <p className="mt-1 text-2xl font-bold">{customers.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Points en circulation</p>
          <p className="mt-1 text-2xl font-bold text-primary">{totalPoints}</p>
        </Card>
      </div>

      <FilterTogglePanel
        toggleLabel="Filtrer les clients"
        summary={`${filtered.length} client${filtered.length !== 1 ? "s" : ""}`}
      >
      <div className="natus-filter-bar mt-6 overflow-visible p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[200px] flex-1 max-w-md">
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
        </div>
        <p className="mt-3 text-sm text-muted">
          {filtered.length} client{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>
      </FilterTogglePanel>

      <Card padding={false} className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-primary-light/50">
                <th className="px-6 py-3 text-left font-medium text-muted">Client</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Carte</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Statut</th>
                <th className="px-6 py-3 text-right font-medium text-muted">Points</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Adhésion</th>
                <th className="px-6 py-3 text-right font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => {
                const tier = loyaltyTierFromPoints(customer.loyalty_points);
                return (
                  <tr key={customer.id} className="border-b border-border">
                    <td className="px-6 py-4">
                      <p className="font-medium">{customer.full_name}</p>
                      <p className="text-xs text-muted">{formatPhoneDisplay(customer.phone)}</p>
                      {customer.email && (
                        <p className="text-xs text-muted">{customer.email}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">{customer.card_number}</td>
                    <td className="px-6 py-4">
                      <LoyaltyTierBadge tier={tier} />
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-primary">
                      {customer.loyalty_points}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted">
                      {formatDate(customer.created_at)}
                    </td>
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
                          href={`/carte/${customer.qr_token}`}
                          target="_blank"
                          title="Ouvrir la carte client"
                          className="order-action-icon flex h-8 w-8 items-center justify-center border border-primary/30 bg-page text-primary hover:bg-primary-light"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted">
                    {customers.length === 0
                      ? "Aucun client fidélité — créez le premier"
                      : "Aucun résultat pour cette recherche"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showCreate && (
        <CreateLoyaltyCustomerModal
          storeId={storeId || undefined}
          onClose={() => setShowCreate(false)}
          onCreated={(customer) => {
            setCustomers((prev) => [customer, ...prev]);
            setShowCreate(false);
            setQrCustomer(customer);
          }}
        />
      )}

      {qrCustomer && (
        <Modal onClose={() => setQrCustomer(null)} size="md">
          <h3 className="mb-2 text-center text-lg font-semibold">Carte créée — à montrer au client</h3>
          <LoyaltyCardQrForCashier
            customer={qrCustomer}
            onClose={() => setQrCustomer(null)}
          />
        </Modal>
      )}

      {detailCustomer && (
        <Modal onClose={() => setDetailCustomer(null)} size="md">
          <div className="mb-4 flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Carte fidélité</h3>
          </div>
          <LoyaltyWalletCard customer={detailCustomer} compact />
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/carte/${detailCustomer.qr_token}`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium hover:bg-primary-light/30"
            >
              <ExternalLink className="h-4 w-4" />
              Lien client
            </Link>
            <p className="w-full text-xs text-muted break-all">
              {loyaltyCardPublicUrl(detailCustomer.qr_token)}
            </p>
            <p className="text-xs text-muted">
              Valeur des points : ≈ {formatCurrency(detailCustomer.loyalty_points)}
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
