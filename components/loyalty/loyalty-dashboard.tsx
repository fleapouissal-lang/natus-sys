import Link from "next/link";
import { Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/loyalty/phone";
import type { LoyaltyStats, LoyaltySettings } from "@/lib/types";
import { pointsValueInMad } from "@/lib/loyalty/settings";
import { DEFAULT_LOYALTY_SETTINGS } from "@/lib/loyalty/config";

export function LoyaltyDashboard({
  stats,
  customerBasePath,
  loyaltySettings = DEFAULT_LOYALTY_SETTINGS,
}: {
  stats: LoyaltyStats;
  customerBasePath: string;
  loyaltySettings?: LoyaltySettings;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">Membres fidélité</p>
          <p className="mt-1 text-3xl font-bold">{stats.totalMembers}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Points distribués</p>
          <p className="mt-1 text-3xl font-bold text-success">{stats.pointsDistributed}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Points utilisés</p>
          <p className="mt-1 text-3xl font-bold text-primary">{stats.pointsRedeemed}</p>
        </Card>
      </div>

      <Card padding={false}>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Meilleurs clients</h2>
            <p className="text-sm text-muted">Classement par solde de points</p>
          </div>
          <Link
            href={
              customerBasePath.startsWith("/director")
                ? "/director/clients"
                : `${customerBasePath}/customers`
            }
            className="text-sm font-medium text-primary hover:underline"
          >
            Voir tous les clients →
          </Link>
        </div>
        {stats.topCustomers.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted">Aucun membre fidélité</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-primary-light/30">
                  <th className="px-6 py-3 text-left font-medium text-muted">#</th>
                  <th className="px-6 py-3 text-left font-medium text-muted">Client</th>
                  <th className="px-6 py-3 text-left font-medium text-muted">Carte</th>
                  <th className="px-6 py-3 text-right font-medium text-muted">Points</th>
                  <th className="px-6 py-3 text-right font-medium text-muted">Valeur</th>
                  <th className="px-6 py-3 text-right font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats.topCustomers.map((customer, index) => (
                  <tr
                    key={customer.id}
                    className="border-b border-border last:border-b-0 hover:bg-primary-light/10"
                  >
                    <td className="px-6 py-4 font-medium text-muted">#{index + 1}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground">{customer.full_name}</p>
                      <p className="text-muted">{formatPhoneDisplay(customer.phone)}</p>
                    </td>
                    <td className="px-6 py-4">{customer.card_number}</td>
                    <td className="px-6 py-4 text-right font-bold text-primary">
                      {customer.loyalty_points} pts
                    </td>
                    <td className="px-6 py-4 text-right text-muted">
                      ≈ {formatCurrency(pointsValueInMad(customer.loyalty_points, loyaltySettings))}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end">
                        <Link
                          href={`${customerBasePath}/${customer.id}`}
                          title="Voir la fiche client"
                          className="order-action-icon flex h-8 w-8 items-center justify-center border border-primary/30 bg-page text-primary hover:bg-primary-light"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
