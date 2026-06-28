import {
  ArrowLeftRight,
  PackagePlus,
  ShoppingBag,
  SlidersHorizontal,
} from "lucide-react";
import { ActivityLog } from "@/components/activity/activity-log";
import { MobileStatCard, MobileStatGrid } from "@/components/dashboard/mobile-stat-card";
import { Card } from "@/components/ui/card";
import type { ActivityEntry } from "@/lib/types";

export function ManagerActivityPanel({
  activities,
  scopeLabel,
  showStoreColumn = false,
}: {
  activities: ActivityEntry[];
  scopeLabel: string;
  showStoreColumn?: boolean;
}) {
  const stockAdds = activities.filter((a) => a.kind === "stock_add").length;
  const adjustments = activities.filter((a) => a.kind === "stock_adjustment").length;
  const transfers = activities.filter(
    (a) => a.kind === "stock_transfer_in" || a.kind === "stock_transfer_out"
  ).length;
  const sales = activities.filter((a) => a.kind === "sale").length;

  return (
    <div className="space-y-6">
      <MobileStatGrid>
        <MobileStatCard label="Ajouts stock" value={String(stockAdds)} icon={PackagePlus} />
        <MobileStatCard label="Ajustements" value={String(adjustments)} icon={SlidersHorizontal} />
        <MobileStatCard label="Transferts hub" value={String(transfers)} icon={ArrowLeftRight} />
        <MobileStatCard label="Ventes" value={String(sales)} icon={ShoppingBag} variant="gold" />
      </MobileStatGrid>

      <div className="hidden gap-4 sm:grid-cols-2 lg:grid-cols-5 md:grid">
        <Card>
          <p className="text-sm text-muted">Actions récentes</p>
          <p className="mt-1 text-2xl font-bold">{activities.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Ajouts stock</p>
          <p className="mt-1 text-2xl font-bold">{stockAdds}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Ajustements</p>
          <p className="mt-1 text-2xl font-bold">{adjustments}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Transferts hub</p>
          <p className="mt-1 text-2xl font-bold">{transfers}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Ventes</p>
          <p className="mt-1 text-2xl font-bold">{sales}</p>
        </Card>
      </div>

      <ActivityLog
        activities={activities}
        scopeLabel={scopeLabel}
        showStoreColumn={showStoreColumn}
      />
    </div>
  );
}
