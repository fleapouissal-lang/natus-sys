import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getStoreComplaintsForProfile } from "@/lib/feedback/complaints";
import { StoreComplaintsList } from "@/components/feedback/store-complaints-list";

export default async function ManagerReclamationsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const complaints = await getStoreComplaintsForProfile(profile);
  const newCount = complaints.filter((c) => c.status === "new").length;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Réclamations clients</h1>
        <p className="mt-1 text-muted">
          Réclamations WhatsApp des clients — magasin de livraison / vente (gérants uniquement)
          {newCount > 0 ? ` · ${newCount} nouvelle(s)` : ""}
        </p>
      </div>

      <StoreComplaintsList complaints={complaints} />
    </div>
  );
}
