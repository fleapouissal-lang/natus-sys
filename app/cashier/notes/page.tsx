import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getShopifyOrderFollowUpNotes } from "@/lib/orders";
import { CashierOrderNotesList } from "@/components/cashier/cashier-order-notes-list";

export default async function CashierNotesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  if (!profile.store_id) {
    return (
      <div className="animate-fade-in space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Notes commandes</h1>
        <p className="text-muted">Aucun magasin assigné à votre compte.</p>
      </div>
    );
  }

  const orders = await getShopifyOrderFollowUpNotes(profile);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notes commandes</h1>
        <p className="mt-1 text-muted">
          Suivi des appels clients — confirmations WhatsApp non reçues
        </p>
      </div>

      <CashierOrderNotesList orders={orders} />
    </div>
  );
}
