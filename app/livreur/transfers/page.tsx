import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getLivreurHubTransfers } from "@/lib/hub-transfers";
import { getLivreurStoreStockTransfers } from "@/lib/store-transfers";
import { LivreurHubTransfers } from "@/components/livreur/livreur-hub-transfers";

export default async function LivreurTransfersPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "livreur") redirect("/login");

  const [transfers, storeTransfers] = await Promise.all([
    getLivreurHubTransfers(profile.id),
    getLivreurStoreStockTransfers(profile.id),
  ]);

  return (
    <div className="animate-fade-in">
      <LivreurHubTransfers transfers={transfers} storeTransfers={storeTransfers} />
    </div>
  );
}
