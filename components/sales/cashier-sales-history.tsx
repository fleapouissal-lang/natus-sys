"use client";

import { useMemo, useState } from "react";
import { Filter, Banknote, CreditCard } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { selectClassName } from "@/components/ui/select";
import {
  formatCurrency,
  formatDate,
  formatPaymentMethod,
  toLocalDateKey,
} from "@/lib/utils";
import type { PaymentMethod, Sale } from "@/lib/types";

type CashierSale = Sale & {
  stores?: { name: string; city: string } | null;
};

const PAYMENT_OPTIONS: { value: "" | PaymentMethod; label: string }[] = [
  { value: "", label: "Tous les paiements" },
  { value: "cash", label: "Espèces" },
  { value: "card", label: "Carte bancaire" },
];

function paymentVariant(method: string): "default" | "success" | "accent" {
  return method === "card" ? "accent" : "success";
}

export function CashierSalesHistory({ sales }: { sales: CashierSale[] }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"" | PaymentMethod>("");

  const filtered = useMemo(() => {
    return sales.filter((sale) => {
      if (paymentFilter && sale.payment_method !== paymentFilter) return false;

      const saleDay = toLocalDateKey(sale.created_at);
      if (dateFrom && saleDay < dateFrom) return false;
      if (dateTo && saleDay > dateTo) return false;

      return true;
    });
  }, [sales, dateFrom, dateTo, paymentFilter]);

  const stats = useMemo(() => {
    const total = filtered.reduce((sum, s) => sum + Number(s.total), 0);
    const cash = filtered
      .filter((s) => s.payment_method === "cash")
      .reduce((sum, s) => sum + Number(s.total), 0);
    const card = filtered
      .filter((s) => s.payment_method === "card")
      .reduce((sum, s) => sum + Number(s.total), 0);
    return { count: filtered.length, total, cash, card };
  }, [filtered]);

  function resetFilters() {
    setDateFrom("");
    setDateTo("");
    setPaymentFilter("");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-muted">Ventes affichées</p>
          <p className="mt-1 text-2xl font-bold">{stats.count}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Chiffre d&apos;affaires</p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(stats.total)}</p>
        </Card>
        <Card>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <Banknote className="h-4 w-4" />
            Espèces
          </p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(stats.cash)}</p>
        </Card>
        <Card>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <CreditCard className="h-4 w-4" />
            Carte
          </p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(stats.card)}</p>
        </Card>
      </div>

      <Card padding={false}>
        <div className="space-y-4 p-6">
          <CardHeader
            title="Historique des ventes"
            description={`${filtered.length} transaction(s) — vos ventes en caisse`}
          />

          <div className="rounded-lg border border-border bg-background p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
              <Filter className="h-4 w-4" />
              Filtrer
            </div>
            <div className="grid gap-3 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Date début</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Date fin</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Mode de paiement</label>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value as "" | PaymentMethod)}
                  className={selectClassName}
                >
                  {PAYMENT_OPTIONS.map((opt) => (
                    <option key={opt.value || "all"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:border-primary hover:text-foreground cursor-pointer"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-natus max-h-[560px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-primary-light/80 backdrop-blur-sm">
              <tr className="border-y border-border">
                <th className="px-6 py-3 text-left font-medium text-muted">Date</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Magasin</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Paiement</th>
                <th className="px-6 py-3 text-right font-medium text-muted">Montant</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Réf.</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sale) => (
                <tr key={sale.id} className="border-b border-border">
                  <td className="px-6 py-4 whitespace-nowrap">{formatDate(sale.created_at)}</td>
                  <td className="px-6 py-4">
                    {sale.stores?.name || "—"}
                    {sale.stores?.city && (
                      <p className="text-xs text-muted">{sale.stores.city}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={paymentVariant(sale.payment_method)}>
                      {formatPaymentMethod(sale.payment_method)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    {formatCurrency(Number(sale.total))}
                  </td>
                  <td className="px-6 py-4">
                    <Badge>{sale.id.slice(0, 8)}</Badge>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted">
                    Aucune vente pour ces filtres
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
