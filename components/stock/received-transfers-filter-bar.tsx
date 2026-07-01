"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Search,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { DateInputField } from "@/components/ui/date-input-field";
import { SelectMenu } from "@/components/ui/select-menu";
import type {
  ReceivedTransferStatusFilter,
  ReceivedTransfersFilterScope,
} from "@/lib/stock-transfers/received-filters";
import { RECEIVED_TRANSFER_STATUS_OPTIONS } from "@/lib/stock-transfers/received-filters";
import type { ReceivedTransferLocationOption } from "@/lib/stock-transfers/received-location-filters";

function ReceivedTransfersFilterBarInner({
  filter,
  resultCount,
  sourceOptions,
  destinationOptions,
  lockDestination = false,
  lockSource = false,
  variant = "received",
  preserveTab,
}: {
  filter: ReceivedTransfersFilterScope;
  resultCount: number;
  sourceOptions: ReceivedTransferLocationOption[];
  destinationOptions: ReceivedTransferLocationOption[];
  lockDestination?: boolean;
  lockSource?: boolean;
  variant?: "received" | "sent" | "pending";
  preserveTab?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [productQuery, setProductQuery] = useState(filter.productQuery);
  const [showAdvanced, setShowAdvanced] = useState(
    () => Boolean(filter.dateFrom || filter.dateTo)
  );

  useEffect(() => {
    setProductQuery(filter.productQuery);
  }, [filter.productQuery]);

  useEffect(() => {
    if (filter.dateFrom || filter.dateTo) {
      setShowAdvanced(true);
    }
  }, [filter.dateFrom, filter.dateTo]);

  function pushParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    if (!preserveTab) {
      params.delete("tab");
    }
    params.delete("type");
    params.delete("product");
    params.delete("city");
    params.delete("store");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const dateFromKey = variant === "sent" ? "sentFrom" : "from";
  const dateToKey = variant === "sent" ? "sentTo" : "to";
  const destParamKey = variant === "sent" ? "listDest" : "dest";
  const filterTitle =
    variant === "pending"
      ? "Filtrer mes commandes"
      : variant === "sent"
        ? "Filtrer les stocks envoyés"
        : "Filtrer les stocks reçus";

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (productQuery === filter.productQuery) return;
      pushParams({ q: productQuery || undefined });
    }, 300);
    return () => clearTimeout(timeout);
  }, [productQuery, filter.productQuery]);

  function setStatus(status: ReceivedTransferStatusFilter) {
    pushParams({ status: status === "all" ? undefined : status });
  }

  function resetFilters() {
    setProductQuery("");
    pushParams({
      q: undefined,
      [dateFromKey]: undefined,
      [dateToKey]: undefined,
      status: undefined,
      source: undefined,
      [destParamKey]: undefined,
    });
  }

  const hasActiveFilters = Boolean(
    filter.productQuery ||
      filter.dateFrom ||
      filter.dateTo ||
      (variant !== "pending" && filter.status !== "all") ||
      filter.sourceStoreId ||
      filter.destStoreId
  );

  const statusSelectOptions = useMemo(
    () =>
      RECEIVED_TRANSFER_STATUS_OPTIONS.filter(
        (option) => variant !== "sent" || option.id !== "en_cours"
      ).map(({ id, label }) => ({
        value: id,
        label,
      })),
    [variant]
  );

  const sourceSelectOptions = useMemo(() => {
    if (!lockSource) return sourceOptions;
    return sourceOptions.filter((option) => option.value !== "");
  }, [sourceOptions, lockSource]);

  const sourceValue = lockSource
    ? sourceSelectOptions[0]?.value ?? filter.sourceStoreId
    : filter.sourceStoreId;

  const destinationSelectOptions = useMemo(() => {
    if (!lockDestination) return destinationOptions;
    return destinationOptions.filter((option) => option.value !== "");
  }, [destinationOptions, lockDestination]);

  const destinationValue = lockDestination
    ? destinationSelectOptions[0]?.value ?? filter.destStoreId
    : filter.destStoreId;

  return (
    <Card className="natus-filter-bar space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <CalendarRange className="h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="font-medium">{filterTitle}</p>
            <p className="text-xs text-muted">
              {resultCount} {variant === "pending" ? "commande" : "transfert"}
              {resultCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-medium text-primary underline-offset-2 hover:underline cursor-pointer"
          >
            Effacer les filtres
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Produit</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
            <input
              type="text"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="Nom, catégorie, code-barres, code…"
              className="natus-field w-full bg-surface py-0 pl-10 pr-3 text-sm"
            />
          </div>
        </div>

        <SelectMenu
          label="Source"
          value={sourceValue}
          onChange={(value) => pushParams({ source: value || undefined })}
          options={sourceSelectOptions}
          defaultIcon={ArrowUpFromLine}
          showIcons={false}
          size="sm"
          disabled={lockSource && sourceSelectOptions.length <= 1}
        />

        <SelectMenu
          label="Destination"
          value={destinationValue}
          onChange={(value) => pushParams({ [destParamKey]: value || undefined })}
          options={destinationSelectOptions}
          defaultIcon={ArrowDownToLine}
          showIcons={false}
          size="sm"
          disabled={lockDestination && destinationSelectOptions.length <= 1}
        />

        {variant !== "pending" && (
          <SelectMenu
            label="Statut"
            value={filter.status}
            onChange={(value) => setStatus(value as ReceivedTransferStatusFilter)}
            options={statusSelectOptions}
            defaultIcon={CircleDot}
            showIcons={false}
            size="sm"
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setShowAdvanced((open) => !open)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline cursor-pointer"
        >
          {showAdvanced ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Masquer les filtres avancés
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Voir plus de filtrage
            </>
          )}
        </button>
      </div>

      {showAdvanced && (
        <div className="grid grid-cols-1 gap-3 border-t border-border/60 pt-4 sm:grid-cols-2 lg:max-w-xl">
          <DateInputField
            label="Date début"
            value={filter.dateFrom}
            onChange={(from) => pushParams({ [dateFromKey]: from || undefined })}
          />
          <DateInputField
            label="Date fin"
            value={filter.dateTo}
            onChange={(to) => pushParams({ [dateToKey]: to || undefined })}
          />
        </div>
      )}
    </Card>
  );
}

export function ReceivedTransfersFilterBar(props: {
  filter: ReceivedTransfersFilterScope;
  resultCount: number;
  sourceOptions: ReceivedTransferLocationOption[];
  destinationOptions: ReceivedTransferLocationOption[];
  lockDestination?: boolean;
  lockSource?: boolean;
  variant?: "received" | "sent" | "pending";
  preserveTab?: string;
}) {
  return (
    <Suspense fallback={null}>
      <ReceivedTransfersFilterBarInner {...props} />
    </Suspense>
  );
}
