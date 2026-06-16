"use client";

import { useCallback, useState } from "react";
import { Copy, Check, Share2, RefreshCw } from "lucide-react";
import { LoyaltyCardInstall } from "@/components/loyalty/loyalty-card-install";
import { Button } from "@/components/ui/button";
import { LoyaltyWalletCard } from "@/components/loyalty/loyalty-wallet-card";
import { loyaltyCardPublicUrl } from "@/lib/loyalty/qr";
import { formatDate } from "@/lib/utils";
import { LOYALTY_MIN_POINTS_TO_REDEEM } from "@/lib/loyalty/config";
import { canRedeemLoyaltyPoints, pointsUntilRedemption } from "@/lib/loyalty/points";
import type { LoyaltyCustomer, LoyaltyTransaction } from "@/lib/types";

export function LoyaltyCardClientView({
  initialCustomer,
  initialTransactions,
}: {
  initialCustomer: LoyaltyCustomer;
  initialTransactions: LoyaltyTransaction[];
}) {
  const [customer, setCustomer] = useState(initialCustomer);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const cardUrl = loyaltyCardPublicUrl(customer.qr_token);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/loyalty/card/${customer.qr_token}`);
      if (!res.ok) return;
      const data = await res.json();
      setCustomer((prev) => ({ ...prev, ...data.customer }));
      setTransactions(data.transactions);
    } finally {
      setRefreshing(false);
    }
  }, [customer.qr_token]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(cardUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Ma carte fidélité Natus",
          text: `${customer.full_name} — ${customer.loyalty_points} points`,
          url: cardUrl,
        });
        return;
      } catch {
        // user cancelled
      }
    }
    await copyLink();
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
          Ma carte fidélité
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Natus Cosmétiques</h1>
        <p className="mt-1 text-sm text-muted">{customer.card_number}</p>
      </div>

      <LoyaltyWalletCard customer={customer} />

      <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
        {canRedeemLoyaltyPoints(customer.loyalty_points) ? (
          <>
            <p className="font-semibold text-success">Points utilisables en caisse</p>
            <p className="mt-1 text-muted">
              Présentez votre carte en magasin : le caissier pourra déduire vos{" "}
              <span className="font-medium text-foreground">{customer.loyalty_points} points</span>{" "}
              sur votre achat (1 pt = 1 MAD).
            </p>
          </>
        ) : (
          <>
            <p className="font-semibold text-foreground">
              Paiement avec points dès {LOYALTY_MIN_POINTS_TO_REDEEM} pts
            </p>
            <p className="mt-1 text-muted">
              Vous avez {customer.loyalty_points} pts — encore{" "}
              <span className="font-medium text-primary">
                {pointsUntilRedemption(customer.loyalty_points)} pts
              </span>{" "}
              pour utiliser vos points à la caisse et obtenir une réduction sur vos produits.
            </p>
          </>
        )}
      </div>

      <LoyaltyCardInstall token={customer.qr_token} />

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="secondary"
          className="gap-2"
          onClick={() => void shareLink()}
        >
          <Share2 className="h-4 w-4" />
          Partager
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="gap-2"
          onClick={() => void copyLink()}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copié" : "Copier le lien"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="col-span-2 gap-2"
          onClick={() => void refresh()}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Actualiser mes points
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">Historique des points</h2>
        {transactions.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Aucun mouvement — vos points apparaîtront après un achat en magasin.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {transactions.map((tx) => (
              <li
                key={tx.id}
                className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {tx.type === "earn" ? "Gain" : "Utilisation"}
                  </p>
                  <p className="text-xs text-muted">
                    {tx.description || "Mouvement fidélité"}
                  </p>
                  <p className="text-xs text-muted">{formatDate(tx.created_at)}</p>
                </div>
                <p
                  className={
                    tx.type === "earn"
                      ? "text-sm font-bold text-success"
                      : "text-sm font-bold text-danger"
                  }
                >
                  {tx.type === "earn" ? "+" : "-"}
                  {tx.points}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-4 text-center text-sm text-muted">
        <p className="font-medium text-foreground">Apple Wallet / Google Wallet</p>
        <p className="mt-1">Ajout au wallet natif — bientôt disponible.</p>
      </div>
    </div>
  );
}

export function LoyaltyCardShareForCashier({
  customer,
  onClose,
}: {
  customer: LoyaltyCustomer;
  onClose?: () => void;
}) {
  const cardUrl = loyaltyCardPublicUrl(customer.qr_token);
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(cardUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-muted">
        Montrez la carte au client — il peut scanner le code-barres en caisse ou ouvrir le lien sur son téléphone.
      </p>
      <LoyaltyWalletCard customer={customer} compact />
      <p className="text-xs text-muted break-all px-2 text-center">{cardUrl}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="secondary" onClick={() => void copyLink()}>
          {copied ? "Lien copié" : "Copier le lien"}
        </Button>
        <a
          href={cardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Ouvrir sur téléphone
        </a>
        {onClose && (
          <Button type="button" variant="secondary" onClick={onClose}>
            Fermer
          </Button>
        )}
      </div>
    </div>
  );
}

/** @deprecated use LoyaltyCardShareForCashier */
export const LoyaltyCardQrForCashier = LoyaltyCardShareForCashier;
