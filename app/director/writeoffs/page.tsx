import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getStoreProductWriteoffs } from "@/lib/store-writeoffs/list";
import { WriteoffsValidationList } from "@/components/store-writeoffs/writeoffs-validation-list";

export default async function DirectorWriteoffsPage() {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) redirect("/login");

  const [pending, history] = await Promise.all([
    getStoreProductWriteoffs(profile, { status: "pending", limit: 200 }),
    getStoreProductWriteoffs(profile, {
      status: ["approved", "rejected"],
      limit: 80,
    }),
  ]);

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Retours stock magasin</h1>
        <p className="mt-1 text-muted">
          Validation des retours caissiers (périmé / cassé) — déduction du stock à la validation
          {pending.length > 0 ? ` · ${pending.length} en attente` : ""}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
          En attente de validation
        </h2>
        <WriteoffsValidationList writeoffs={pending} canValidate />
      </section>

      {history.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Historique</h2>
          <WriteoffsValidationList writeoffs={history} canValidate={false} />
        </section>
      )}
    </div>
  );
}
