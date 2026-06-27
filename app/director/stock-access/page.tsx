import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { StockModifyAccessDirectorPanel } from "@/components/stock-modify-access/stock-modify-access-director-panel";
import {
  listStockModifyAccessMovements,
  listStockModifyAccessRequests,
} from "@/lib/stock-modify-access/queries";
import { isRequestEffectiveGrant } from "@/lib/stock-modify-access/utils";

export default async function DirectorStockAccessPage() {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) redirect("/login");

  const [pendingRequests, allRequests, movements] = await Promise.all([
    listStockModifyAccessRequests({ status: "pending" }),
    listStockModifyAccessRequests(),
    listStockModifyAccessMovements({ limit: 150 }),
  ]);

  const activeApprovedRequests = allRequests.filter((request) =>
    isRequestEffectiveGrant(
      request,
      allRequests.filter((row) => row.requester_id === request.requester_id)
    )
  );
  const recentRequests = allRequests;

  return (
    <div className="animate-fade-in space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Accès modification stock</h1>
      <StockModifyAccessDirectorPanel
        pendingRequests={pendingRequests}
        activeApprovedRequests={activeApprovedRequests}
        recentRequests={recentRequests.filter((r) => r.status !== "pending").slice(0, 50)}
        movements={movements}
      />
    </div>
  );
}
