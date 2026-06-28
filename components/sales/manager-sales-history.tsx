"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Banknote, CreditCard } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { SalesAgendaFilter } from "@/components/sales/sales-agenda-filter";
import { SaleDetailModal } from "@/components/sales/sale-detail-modal";
import { SalesHistoryTable } from "@/components/sales/sales-history-table";
import { formatCurrency, toLocalDateKey } from "@/lib/utils";
import {
  canCancelSaleAsDirector,
  canCancelSaleAsManager,
} from "@/lib/sales/sale-cancel";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { PaymentMethod, Sale, Store } from "@/lib/types";

export function ManagerSalesHistory({
  sales,
  storeLabel,
  stores,
  selectedStoreId,
}: {
  sales: Sale[];
  storeLabel: string;
  stores: Store[];
  selectedStoreId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"" | PaymentMethod>("");
  const [detailSale, setDetailSale] = useState<Sale | null>(null);

  const isDirector = pathname.startsWith("/director");

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

  function handleStoreChange(storeId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (storeId) {
      params.set("store", storeId);
    } else {
      params.delete("store");
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function canCancelSale(sale: Sale) {
    return isDirector ? canCancelSaleAsDirector(sale) : canCancelSaleAsManager(sale);
  }

  const paginationKey = `${dateFrom}|${dateTo}|${paymentFilter}|${selectedStoreId}`;
  const listPagination = usePagination(filtered, DEFAULT_PAGE_SIZE, paginationKey);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
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
            TPE
          </p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(stats.card)}</p>
        </Card>
      </div>

      <SalesAgendaFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        paymentFilter={paymentFilter}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onPaymentChange={setPaymentFilter}
        onReset={resetFilters}
        resultCount={filtered.length}
        stores={stores}
        selectedStoreId={selectedStoreId}
        onStoreChange={handleStoreChange}
        pagination={{
          page: listPagination.page,
          totalPages: listPagination.totalPages,
          rangeStart: listPagination.rangeStart,
          rangeEnd: listPagination.rangeEnd,
          totalItems: listPagination.totalItems,
          onPageChange: listPagination.setPage,
        }}
      />

      <Card padding={false}>
        <div className="p-4 md:p-6">
          <CardHeader
            title="Historique des ventes"
            description={storeLabel}
          />
        </div>

        <SalesHistoryTable
          sales={listPagination.paginated}
          showStore={false}
          showCashier
          showLineItems={isDirector}
          onViewSale={setDetailSale}
          showPagination={false}
        />
      </Card>

      {detailSale && (
        <SaleDetailModal
          sale={detailSale}
          onClose={() => setDetailSale(null)}
          canCancel={canCancelSale(detailSale)}
          cancelBlockedHint={
            !isDirector && !canCancelSaleAsManager(detailSale) && !detailSale.cancelled_at
              ? "Annulation impossible après 1 h — contactez le directeur"
              : undefined
          }
          onCancelled={() => router.refresh()}
        />
      )}
    </div>
  );
}
