import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getLivreurHubTransfers } from "@/lib/hub-transfers";
import { LivreurHubTransfers } from "@/components/livreur/livreur-hub-transfers";

export default async function LivreurTransfersPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "livreur") redirect("/login");

  const transfers = await getLivreurHubTransfers(profile.id);

  return (
    <div className="animate-fade-in">
      <LivreurHubTransfers transfers={transfers} />
    </div>
  );
}
