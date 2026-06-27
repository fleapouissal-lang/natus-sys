import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getStoreById } from "@/lib/inventory";
import { getProClientsForStaff } from "@/lib/loyalty/list-customers";
import { CashierProClientsManager } from "@/components/loyalty/cashier-pro-clients-manager";

export default async function CashierProClientsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const store = profile.store_id ? await getStoreById(profile.store_id) : null;
  const customers = await getProClientsForStaff(profile);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clients Pro</h1>
        <p className="mt-1 text-muted">
          Comptes professionnels — remise en caisse, sans points fidélité
          {store ? ` — ${store.name}, ${store.city}` : ""}
        </p>
      </div>

      <CashierProClientsManager
        customers={customers}
        storeId={profile.store_id}
        storeName={store?.name}
      />
    </div>
  );
}
