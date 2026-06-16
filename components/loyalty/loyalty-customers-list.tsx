"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { loyaltyTierFromPoints, loyaltyTierLabel } from "@/lib/loyalty/tiers";
import { formatDate } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/loyalty/phone";
import type { LoyaltyCustomer } from "@/lib/types";

export function LoyaltyCustomersList({
  customers,
  detailBasePath,
}: {
  customers: LoyaltyCustomer[];
  detailBasePath: string;
}) {
  const [search, setSearch] = useState("");

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

  return (
    <>
      <div className="natus-filter-bar overflow-visible p-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, téléphone, carte FID…"
            className="natus-field w-full bg-surface py-0 pl-10 pr-3 text-sm"
          />
        </div>
        <p className="mt-3 text-sm text-muted">
          {filtered.length} client{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

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
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => {
                const tier = loyaltyTierFromPoints(customer.loyalty_points);
                return (
                  <tr key={customer.id} className="border-b border-border last:border-b-0">
                    <td className="px-6 py-4">
                      <Link
                        href={`${detailBasePath}/${customer.id}`}
                        className="group block"
                      >
                        <p className="font-medium text-foreground group-hover:text-primary">
                          {customer.full_name}
                        </p>
                        <p className="text-xs text-muted">{formatPhoneDisplay(customer.phone)}</p>
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-mono">{customer.card_number}</td>
                    <td className="px-6 py-4">
                      <Badge variant={tier === "gold" ? "warning" : "default"}>
                        {loyaltyTierLabel(tier)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-primary">
                      {customer.loyalty_points}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted">
                      {formatDate(customer.created_at)}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted">
                    Aucun client trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
