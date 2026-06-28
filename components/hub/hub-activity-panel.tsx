import {
  ArrowLeftRight,
  PackagePlus,
  SlidersHorizontal,
} from "lucide-react";
import { ActivityLog } from "@/components/activity/activity-log";
import { MobileStatCard, MobileStatGrid } from "@/components/dashboard/mobile-stat-card";
import { Card } from "@/components/ui/card";
import type { ActivityEntry } from "@/lib/types";

export function HubActivityPanel({
  activities,
  scopeLabel,
}: {
  activities: ActivityEntry[];
  scopeLabel: string;
}) {
  const stockAdds = activities.filter((a) => a.kind === "stock_add").length;
  const adjustments = activities.filter((a) => a.kind === "stock_adjustment").length;
  const transfers = activities.filter(
    (a) => a.kind === "stock_transfer_in" || a.kind === "stock_transfer_out"
  ).length;

  return (
    <div className="space-y-6">
      <MobileStatGrid>
        <MobileStatCard label="Actions" value={String(activities.length)} icon={PackagePlus} />
        <MobileStatCard label="Ajouts stock" value={String(stockAdds)} icon={PackagePlus} />
        <MobileStatCard
          label="Ajustements"
          value={String(adjustments)}
          icon={SlidersHorizontal}
        />
        <MobileStatCard
          label="Transferts"
          value={String(transfers)}
          icon={ArrowLeftRight}
          variant="gold"
        />
      </MobileStatGrid>

      <div className="hidden gap-4 sm:grid-cols-2 lg:grid-cols-4 md:grid">
        <Card>
          <p className="text-sm text-muted">Actions enregistrées</p>
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
          <p className="text-sm text-muted">Transferts</p>
          <p className="mt-1 text-2xl font-bold">{transfers}</p>
        </Card>
      </div>

      <ActivityLog activities={activities} scopeLabel={scopeLabel} showStoreColumn={false} />
    </div>
  );
}
