"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, PackageX, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { ProductImage } from "@/components/pos/product-image";
import { WriteoffPhotosGallery } from "@/components/store-writeoffs/writeoff-photos";
import { WRITEOFF_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import {
  rejectStoreProductWriteoff,
  validateStoreProductWriteoff,
} from "@/lib/actions";
import {
  WRITEOFF_REASON_LABELS,
  WRITEOFF_STATUS_LABELS,
  canValidateWriteoff,
  writeoffCreatorLabel,
  writeoffReasonSummary,
  writeoffValidatorLine,
  type StoreProductWriteoff,
} from "@/lib/store-writeoffs/types";
import type { Profile } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function WriteoffsValidationList({
  writeoffs,
  profile,
  canValidate = false,
  emptyMessage,
  paginationKey,
}: {
  writeoffs: StoreProductWriteoff[];
  profile?: Pick<Profile, "role">;
  canValidate?: boolean;
  emptyMessage?: string;
  paginationKey?: string;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    paginated,
    page,
    setPage,
    totalPages,
    rangeStart,
    rangeEnd,
    totalItems,
  } = usePagination(writeoffs, WRITEOFF_PAGE_SIZE, paginationKey);

  function runAction(id: string, action: () => Promise<{ error?: string } | { success: true }>) {
    setLoadingId(id);
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

  if (writeoffs.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <PackageX className="h-10 w-10 text-muted" />
        <p className="text-muted">
          {emptyMessage ?? "Aucune demande de retour pour le moment"}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {paginated.map((writeoff) => {
        const isPending = writeoff.status === "pending";
        const canValidateItem = profile
          ? canValidateWriteoff(profile, writeoff)
          : canValidate;
        return (
          <Card key={writeoff.id} padding={false}>
            <div className="border-b border-border px-4 py-4 md:px-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{writeoffReasonSummary(writeoff)}</p>
                    {writeoff.stores?.is_hub && (
                      <Badge variant="accent">Dépôt</Badge>
                    )}
                    <Badge
                      variant={
                        writeoff.status === "approved"
                          ? "success"
                          : writeoff.status === "rejected"
                            ? "warning"
                            : "accent"
                      }
                    >
                      {WRITEOFF_STATUS_LABELS[writeoff.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {writeoff.stores?.name}, {writeoff.stores?.city} ·{" "}
                    {formatDate(writeoff.created_at)}
                  </p>
                  <p className="text-sm text-muted">
                    {writeoffCreatorLabel(writeoff)} :{" "}
                    {writeoff.creator?.full_name || writeoff.creator?.email || "—"}
                  </p>
                  {writeoff.stores?.is_hub && isPending && !canValidateItem && (
                    <p className="mt-1 text-xs text-muted">
                      Validation réservée au directeur (retour en stock dépôt Hub)
                    </p>
                  )}
                  {writeoff.notes && (
                    <p className="mt-1 text-sm text-foreground">{writeoff.notes}</p>
                  )}
                </div>
                {canValidateItem && isPending && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      loading={pending && loadingId === writeoff.id}
                      onClick={() =>
                        runAction(writeoff.id, () => validateStoreProductWriteoff(writeoff.id))
                      }
                    >
                      <Check className="h-4 w-4" />
                      Valider (− stock)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      loading={pending && loadingId === writeoff.id}
                      onClick={() => {
                        const note = window.prompt("Motif du refus (optionnel) :");
                        if (note === null) return;
                        runAction(writeoff.id, () =>
                          rejectStoreProductWriteoff(writeoff.id, note)
                        );
                      }}
                    >
                      <X className="h-4 w-4" />
                      Refuser
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="divide-y divide-border">
              {(writeoff.items || []).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3 md:px-6"
                >
                  {item.products && (
                    <ProductImage
                      product={{ ...item.products, category: "", categories: undefined }}
                      size="xs"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.products?.name || "Produit"}
                    </p>
                    <p className="text-xs text-muted">
                      {WRITEOFF_REASON_LABELS[item.reason]}
                      {item.products?.barcode ? ` · ${item.products.barcode}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-primary">− {item.quantity}</span>
                </div>
              ))}
            </div>
            <WriteoffPhotosGallery photos={writeoff.photos || []} />
            {writeoff.rejection_note && (
              <p className="border-t border-border px-4 py-3 text-sm text-warning md:px-6">
                Refus : {writeoff.rejection_note}
              </p>
            )}
            {writeoffValidatorLine(writeoff) && (
              <p className="border-t border-border px-4 py-2 text-sm text-foreground md:px-6">
                {writeoffValidatorLine(writeoff)}
                {writeoff.validated_at ? (
                  <span className="text-muted"> · {formatDate(writeoff.validated_at)}</span>
                ) : null}
              </p>
            )}
          </Card>
        );
      })}
      {totalItems > WRITEOFF_PAGE_SIZE && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          totalItems={totalItems}
          onPageChange={setPage}
          className="rounded-lg border border-border bg-surface px-4 py-4"
        />
      )}
    </div>
  );
}
