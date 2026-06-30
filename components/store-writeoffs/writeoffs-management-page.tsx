import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { isDirector, isManager } from "@/lib/permissions";
import { loadWriteoffsManagementPage } from "@/lib/store-writeoffs/page-data";
import { WriteoffsFilterBar } from "@/components/store-writeoffs/writeoffs-filter-bar";
import { WriteoffsValidationList } from "@/components/store-writeoffs/writeoffs-validation-list";

export async function WriteoffsManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; store?: string; from?: string; to?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isDirector(profile) && !isManager(profile)) redirect("/login");

  const params = await searchParams;
  const { pending, history, filter } = await loadWriteoffsManagementPage(
    profile,
    params
  );

  const totalCount = pending.length + history.length;
  const isDirectorRole = isDirector(profile);
  const paginationKey = [
    filter.selectedCity,
    filter.selectedStoreId,
    filter.dateFrom,
    filter.dateTo,
  ].join("|");

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Retour en stock</h1>
        <p className="mt-1 text-muted">
          {isDirectorRole
            ? "Validation des retours caissiers (magasin) et dépôt Hub — déduction du stock à la validation. Les retours dépôt sont réservés au directeur."
            : "Retours caissiers en magasin — produits périmés ou cassés. Validez pour déduire le stock du magasin."}
          {pending.length > 0 ? ` · ${pending.length} en attente` : ""}
        </p>
      </div>

      <Suspense fallback={null}>
        <WriteoffsFilterBar filter={filter} resultCount={totalCount} />
      </Suspense>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
          En attente de validation
          {filter.scopeLabel ? ` — ${filter.scopeLabel}` : ""}
        </h2>
        <WriteoffsValidationList
          writeoffs={pending}
          profile={profile}
          paginationKey={`pending|${paginationKey}`}
        />
      </section>

      {(history.length > 0 || totalCount === 0) && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Historique
          </h2>
          <WriteoffsValidationList
            writeoffs={history}
            profile={profile}
            paginationKey={`history|${paginationKey}`}
            emptyMessage={
              totalCount === 0
                ? "Aucun retour pour ces filtres"
                : undefined
            }
          />
        </section>
      )}
    </div>
  );
}
