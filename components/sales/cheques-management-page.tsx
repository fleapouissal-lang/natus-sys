import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getActiveStores } from "@/lib/inventory";
import {
  filterRetailStoresByProfile,
  getCityFilter,
  isDirector,
} from "@/lib/permissions";
import { listSaleCheques } from "@/lib/sales/cheques/list";
import { ChequesListPanel } from "@/components/sales/cheques-list-panel";
import type { UserRole } from "@/lib/types";

export async function ChequesManagementPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  if (
    profile.role !== "cashier" &&
    profile.role !== "manager" &&
    profile.role !== "directeur" &&
    profile.role !== "admin"
  ) {
    redirect("/login");
  }

  const city = getCityFilter(profile);
  const allStores = await getActiveStores(city);
  const stores =
    profile.role === "cashier"
      ? allStores.filter((s) => s.id === profile.store_id)
      : isDirector(profile)
        ? allStores.filter((s) => !s.is_hub)
        : filterRetailStoresByProfile(allStores, profile);

  const storeIds = stores.map((s) => s.id).filter(Boolean) as string[];
  const cheques = storeIds.length > 0 ? await listSaleCheques({ storeIds }) : [];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chèques encaissés</h1>
        <p className="mt-1 text-muted">
          Registre des paiements par chèque — suivi banque, statut et encaissement
        </p>
      </div>
      <ChequesListPanel
        cheques={cheques}
        viewer={{ id: profile.id, role: profile.role as UserRole }}
      />
    </div>
  );
}
