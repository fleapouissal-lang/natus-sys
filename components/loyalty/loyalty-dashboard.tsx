import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/loyalty/phone";
import type { LoyaltyStats } from "@/lib/types";

export function LoyaltyDashboard({
  stats,
  customerBasePath,
}: {
  stats: LoyaltyStats;
  customerBasePath: string;
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
            href={`${customerBasePath}/customers`}
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
              <tbody>
                {stats.topCustomers.map((customer, index) => (
                  <tr
                    key={customer.id}
                    className="border-b border-border last:border-b-0 hover:bg-primary-light/10"
                  >
                    <td className="px-6 py-4 font-medium text-muted">#{index + 1}</td>
                    <td className="px-6 py-4">
                      <Link
                        href={`${customerBasePath}/${customer.id}`}
                        className="group block"
                      >
                        <p className="font-medium text-foreground group-hover:text-primary">
                          {customer.full_name}
                        </p>
                        <p className="text-muted">{formatPhoneDisplay(customer.phone)}</p>
                      </Link>
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
