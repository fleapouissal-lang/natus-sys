import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { StockModifyAccessDirectorPanel } from "@/components/stock-modify-access/stock-modify-access-director-panel";
import {
  listStockModifyAccessMovements,
  listStockModifyAccessRequests,
} from "@/lib/stock-modify-access/queries";

export default async function DirectorStockAccessPage() {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) redirect("/login");

  const [pendingRequests, recentRequests, movements] = await Promise.all([
    listStockModifyAccessRequests({ status: "pending" }),
    listStockModifyAccessRequests(),
    listStockModifyAccessMovements({ limit: 150 }),
  ]);

  return (
    <div className="animate-fade-in space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Accès modification stock</h1>
      <StockModifyAccessDirectorPanel
        pendingRequests={pendingRequests}
        recentRequests={recentRequests.filter((r) => r.status !== "pending").slice(0, 50)}
        movements={movements}
      />
    </div>
  );
}
