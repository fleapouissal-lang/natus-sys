"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Gift } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoyaltyWalletCard } from "@/components/loyalty/loyalty-wallet-card";
import { loyaltyTierFromPoints, loyaltyTierLabel } from "@/lib/loyalty/tiers";
import { loyaltyCardPublicUrl } from "@/lib/loyalty/qr";
import { loyaltyCardVariantLabel } from "@/lib/loyalty/card-variant";
import { canRedeemLoyaltyPoints, pointsUntilRedemption } from "@/lib/loyalty/points";
import { pointsValueInMad } from "@/lib/loyalty/settings";
import { DEFAULT_LOYALTY_SETTINGS } from "@/lib/loyalty/config";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/loyalty/phone";
import type { LoyaltyCustomer, LoyaltyTransaction, LoyaltySettings } from "@/lib/types";

export function LoyaltyCustomerDetailView({
  customer,
  transactions,
  backHref,
  loyaltySettings = DEFAULT_LOYALTY_SETTINGS,
}: {
  customer: LoyaltyCustomer;
  transactions: LoyaltyTransaction[];
  backHref: string;
  loyaltySettings?: LoyaltySettings;
}) {
  const tier = loyaltyTierFromPoints(customer.loyalty_points);
  const redeemEligible = canRedeemLoyaltyPoints(customer.loyalty_points, loyaltySettings);
  const publicUrl = loyaltyCardPublicUrl(customer.qr_token);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={backHref}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour fidélité
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{customer.full_name}</h1>
          <p className="mt-1 text-sm text-muted">
            {formatPhoneDisplay(customer.phone)}
            {customer.email ? ` · ${customer.email}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={tier === "gold" ? "warning" : "default"}>
            {loyaltyTierLabel(tier)}
          </Badge>
          <Badge variant="default">
            {loyaltyCardVariantLabel(customer.card_variant ?? "champagne")}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="space-y-4">
          <Card className="!p-4">
            <div className="mb-3 flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold">Carte fidélité</p>
            </div>
            <LoyaltyWalletCard customer={customer} flipable />
          </Card>

          <Card className="!p-4 text-sm">
            <dl className="space-y-3">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Numéro carte</dt>
                <dd className="font-mono font-medium">{customer.card_number}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Solde points</dt>
                <dd className="font-bold text-primary">{customer.loyalty_points} pts</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Valeur estimée</dt>
                <dd>{formatCurrency(pointsValueInMad(customer.loyalty_points, loyaltySettings))}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Membre depuis</dt>
                <dd>{formatDate(customer.created_at)}</dd>
              </div>
            </dl>

            <div className="mt-4 rounded-lg border border-border bg-page/60 px-3 py-2.5 text-xs text-muted">
              {redeemEligible ? (
                <p className="text-success font-medium">
                  Client éligible à l&apos;utilisation des points en caisse.
                </p>
              ) : (
                <p>
                  Utilisation en caisse à partir de {loyaltySettings.minPointsToRedeem} pts — encore{" "}
                  <span className="font-semibold text-primary">
                    {pointsUntilRedemption(customer.loyalty_points, loyaltySettings)} pts
                  </span>
                  .
                </p>
              )}
            </div>

            <Link
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Ouvrir la carte client
            </Link>
          </Card>
        </div>

        <Card padding={false}>
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold">Historique des points</h2>
            <p className="text-sm text-muted">Gains et utilisations en magasin</p>
          </div>
          {transactions.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-muted">
              Aucun mouvement de points pour ce client.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-primary-light/30">
                    <th className="px-6 py-3 text-left font-medium text-muted">Date</th>
                    <th className="px-6 py-3 text-left font-medium text-muted">Type</th>
                    <th className="px-6 py-3 text-left font-medium text-muted">Description</th>
                    <th className="px-6 py-3 text-right font-medium text-muted">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-border last:border-b-0">
                      <td className="px-6 py-4 whitespace-nowrap text-muted">
                        {formatDate(tx.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={tx.type === "earn" ? "success" : "warning"}>
                          {tx.type === "earn" ? "Gain" : "Utilisation"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-muted">
                        {tx.description || "Mouvement fidélité"}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-bold ${
                          tx.type === "earn" ? "text-success" : "text-danger"
                        }`}
                      >
                        {tx.type === "earn" ? "+" : "-"}
                        {tx.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
