"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { Profile } from "@/lib/types";

export function HubCashiersTable({
  cashiers,
  city,
}: {
  cashiers: Profile[];
  city: string;
}) {
  const {
    paginated,
    page,
    setPage,
    totalPages,
    rangeStart,
    rangeEnd,
    totalItems,
  } = usePagination(cashiers, DEFAULT_PAGE_SIZE);

  if (cashiers.length === 0) return null;

  return (
    <Card padding={false}>
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold">Caissiers — {city}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-primary-light/30">
              <th className="px-6 py-3 text-left font-medium text-muted">Nom</th>
              <th className="px-6 py-3 text-left font-medium text-muted">Magasin</th>
              <th className="px-6 py-3 text-left font-medium text-muted">Statut</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((cashier) => (
              <tr key={cashier.id} className="border-b border-border last:border-b-0">
                <td className="px-6 py-4">
                  <p className="font-medium">{cashier.full_name}</p>
                  <p className="text-muted">{cashier.email}</p>
                </td>
                <td className="px-6 py-4 text-muted">
                  {(cashier.stores as { name?: string } | null)?.name || "—"}
                </td>
                <td className="px-6 py-4">
                  <Badge variant={cashier.is_active ? "success" : "default"}>
                    {cashier.is_active ? "Actif" : "Inactif"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationBar
        page={page}
        totalPages={totalPages}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        totalItems={totalItems}
        onPageChange={setPage}
      />
    </Card>
  );
}
