import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getStoreProductWriteoffs } from "@/lib/store-writeoffs/list";
import { WriteoffsValidationList } from "@/components/store-writeoffs/writeoffs-validation-list";

export default async function ManagerWriteoffsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const [pending, history] = await Promise.all([
    getStoreProductWriteoffs(profile, { status: "pending", limit: 100 }),
    getStoreProductWriteoffs(profile, {
      status: ["approved", "rejected"],
      limit: 50,
    }),
  ]);

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Retours stock magasin</h1>
        <p className="mt-1 text-muted">
          Demandes caissiers — produits périmés ou cassés. Validez pour déduire le stock du
          magasin.
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
