import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/loyalty/phone";
import type { LoyaltyStats } from "@/lib/types";

export function LoyaltyDashboard({ stats }: { stats: LoyaltyStats }) {
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
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Meilleurs clients</h2>
          <p className="text-sm text-muted">Classement par solde de points</p>
        </div>
        {stats.topCustomers.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted">Aucun membre fidélité</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {stats.topCustomers.map((customer, index) => (
                  <tr key={customer.id} className="border-b border-border last:border-b-0">
                    <td className="px-6 py-4 font-medium text-muted">#{index + 1}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{customer.full_name}</p>
                      <p className="text-muted">{formatPhoneDisplay(customer.phone)}</p>
                    </td>
                    <td className="px-6 py-4">{customer.card_number}</td>
                    <td className="px-6 py-4 text-right font-bold text-primary">
                      {customer.loyalty_points} pts
                    </td>
                    <td className="px-6 py-4 text-right text-muted">
                      ≈ {formatCurrency(customer.loyalty_points)}
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
