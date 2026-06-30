import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { loadHubWriteoffsPage } from "@/lib/store-writeoffs/page-data";
import { CashierWriteoffPanel } from "@/components/store-writeoffs/cashier-writeoff-panel";

export default async function HubWriteoffsPage() {
  const profile = await requireRole(["hub"]);
  if (!profile) redirect("/login");

  const { hubStore, products, writeoffs } = await loadHubWriteoffsPage(profile);

  if (!hubStore) {
    return (
      <div className="animate-fade-in space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Retour en stock dépôt</h1>
        <p className="text-muted">
          Aucun entrepôt configuré{profile.city ? ` pour ${profile.city}` : ""}.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Retour en stock dépôt</h1>
        <p className="mt-1 text-muted">
          Produits périmés ou cassés — {hubStore.name}, {hubStore.city}
        </p>
        <p className="mt-1 text-sm text-muted">
          Les demandes sont validées par le directeur uniquement (retour en stock dépôt Hub).
        </p>
      </div>

      <CashierWriteoffPanel products={products} writeoffs={writeoffs} />
    </div>
  );
}
