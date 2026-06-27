import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getStoreById } from "@/lib/inventory";
import { listStorePosNotes } from "@/lib/store/store-pos-notes-actions";
import { StorePosNotesManager } from "@/components/cashier/store-pos-notes-manager";

export default async function CashierNotesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  if (!profile.is_store_pos) {
    redirect("/cashier/sales");
  }

  if (!profile.store_id) {
    return (
      <div className="animate-fade-in space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Notes magasin</h1>
        <p className="text-muted">Aucun magasin assigné à ce compte.</p>
      </div>
    );
  }

  const [store, notesResult] = await Promise.all([
    getStoreById(profile.store_id),
    listStorePosNotes(profile.store_id),
  ]);

  const notes = "notes" in notesResult ? notesResult.notes : [];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notes magasin</h1>
        <p className="mt-1 text-muted">
          Consignes et rappels pour votre équipe — visibles uniquement sur ce compte caisse
          {store ? ` (${store.name}, ${store.city})` : ""}
        </p>
      </div>

      {"error" in notesResult && (
        <p className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{notesResult.error}</p>
      )}

      <StorePosNotesManager
        initialNotes={notes}
        storeId={profile.store_id}
        storeName={store?.name}
      />
    </div>
  );
}
