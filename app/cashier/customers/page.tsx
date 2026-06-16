import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getStoreById } from "@/lib/inventory";
import { getLoyaltyCustomers } from "@/lib/loyalty/list-customers";
import { CashierCustomersManager } from "@/components/loyalty/cashier-customers-manager";

export default async function CashierCustomersPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const store = profile.store_id ? await getStoreById(profile.store_id) : null;
  const customers = await getLoyaltyCustomers(profile, {
    storeOnly: Boolean(profile.store_id),
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clients fidélité</h1>
        <p className="mt-1 text-muted">
          Cartes fidélité et points clients
          {store ? ` — ${store.name}, ${store.city}` : ""}
        </p>
      </div>

      <CashierCustomersManager customers={customers} storeId={profile.store_id} />
    </div>
  );
}
