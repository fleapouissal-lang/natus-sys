"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Copy,
  Check,
  Share2,
  RefreshCw,
  CreditCard,
  Coins,
  History,
  FileText,
  ArrowLeft,
  BriefcaseBusiness,
} from "lucide-react";
import { LoyaltyCardInstall } from "@/components/loyalty/loyalty-card-install";
import { Button } from "@/components/ui/button";
import { LoyaltyWalletCard } from "@/components/loyalty/loyalty-wallet-card";
import { PosInvoice } from "@/components/pos/pos-invoice";
import { loyaltyCardPublicUrl } from "@/lib/loyalty/qr";
import { publicInvoiceToDocumentData } from "@/lib/loyalty/public-invoices";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  canRedeemLoyaltyPoints,
  pointsUntilRedemption,
} from "@/lib/loyalty/points";
import {
  formatLoyaltyEarnRule,
  formatLoyaltyRedeemRule,
  pointsValueInMad,
} from "@/lib/loyalty/settings";
import { PRO_CLIENT_DISCOUNT_PERCENT } from "@/lib/pro-client/discount";
import { DEFAULT_LOYALTY_SETTINGS } from "@/lib/loyalty/config";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants/sales";
import { saleDocumentNumber } from "@/components/pos/sale-document-types";
import type { LoyaltyCustomer, LoyaltySettings } from "@/lib/types";
import type {
  PublicCustomerInvoice,
  PublicCustomerInvoiceDetail,
  PublicLoyaltyTransaction,
} from "@/lib/loyalty/public";
import { cn } from "@/lib/utils";

type PortalTab = "carte" | "points" | "historique" | "factures";

const TABS: { id: PortalTab; label: string; icon: typeof CreditCard }[] = [
  { id: "carte", label: "Ma carte", icon: CreditCard },
  { id: "points", label: "Mes points", icon: Coins },
  { id: "historique", label: "Historique", icon: History },
  { id: "factures", label: "Factures", icon: FileText },
];

export function LoyaltyCardPortal({
  initialCustomer,
  initialTransactions,
  loyaltySettings = DEFAULT_LOYALTY_SETTINGS,
}: {
  initialCustomer: LoyaltyCustomer;
  initialTransactions: PublicLoyaltyTransaction[];
  loyaltySettings?: LoyaltySettings;
}) {
  const [tab, setTab] = useState<PortalTab>("carte");
  const [customer, setCustomer] = useState(initialCustomer);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [settings, setSettings] = useState(loyaltySettings);
  const [invoices, setInvoices] = useState<PublicCustomerInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] =
    useState<PublicCustomerInvoiceDetail | null>(null);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingInvoiceDetail, setLoadingInvoiceDetail] = useState(false);

  const cardUrl = loyaltyCardPublicUrl(customer.qr_token);
  const isPro = Boolean(customer.is_pro_client);
  const isProActive = Boolean(customer.is_pro_client && customer.pro_client_active);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/loyalty/card/${customer.qr_token}`);
      if (!res.ok) return;
      const data = await res.json();
      setCustomer((prev) => ({ ...prev, ...data.customer }));
      setTransactions(data.transactions);
      if (data.settings) setSettings(data.settings);
    } finally {
      setRefreshing(false);
    }
  }, [customer.qr_token]);

  const loadInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    try {
      const res = await fetch(`/api/loyalty/card/${customer.qr_token}/invoices`);
      if (!res.ok) return;
      const data = await res.json();
      setInvoices(data.invoices || []);
    } finally {
      setLoadingInvoices(false);
    }
  }, [customer.qr_token]);

  useEffect(() => {
    if (tab === "factures") {
      void loadInvoices();
    }
  }, [tab, loadInvoices]);

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
          title: "Mon espace client Natus",
          text: `${customer.full_name} — ${customer.loyalty_points} points`,
          url: cardUrl,
        });
        return;
      } catch {
        // cancelled
      }
    }
    await copyLink();
  }

  async function openInvoice(saleId: string) {
    setLoadingInvoiceDetail(true);
    setSelectedInvoice(null);
    try {
      const res = await fetch(
        `/api/loyalty/card/${customer.qr_token}/facture/${saleId}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setSelectedInvoice(data.invoice);
    } finally {
      setLoadingInvoiceDetail(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
          Espace client
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Natus Cosmétiques</h1>
        <p className="mt-1 text-sm text-muted">{customer.full_name}</p>
        {isPro && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <BriefcaseBusiness className="h-3.5 w-3.5" />
            {isProActive
              ? `Client Pro · -${PRO_CLIENT_DISCOUNT_PERCENT}% en magasin`
              : "Client Pro · activation en cours"}
          </p>
        )}
      </div>

      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setSelectedInvoice(null);
            }}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium transition-colors",
              tab === id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface text-muted hover:border-primary/30"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {tab === "carte" && (
        <div className="space-y-4">
          <LoyaltyWalletCard customer={customer} />
          {isPro && !isProActive && (
            <div className="rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-muted">
              Votre compte Client Pro sera activé par l&apos;équipe Natus. La remise
              professionnelle s&apos;appliquera dès l&apos;activation.
            </div>
          )}
          <LoyaltyCardInstall token={customer.qr_token} />
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" className="gap-2" onClick={() => void shareLink()}>
              <Share2 className="h-4 w-4" />
              Partager
            </Button>
            <Button type="button" variant="secondary" className="gap-2" onClick={() => void copyLink()}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copié" : "Copier le lien"}
            </Button>
          </div>
          <p className="text-center text-xs text-muted">
            Accès par lien personnel · pas de mot de passe · conservez cette page
          </p>
        </div>
      )}

      {tab === "points" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-primary/20 bg-champagne/20 p-6 text-center">
            <p className="text-sm text-muted">Solde actuel</p>
            <p className="mt-2 text-4xl font-bold text-primary">{customer.loyalty_points}</p>
            <p className="mt-1 text-sm text-muted">points fidélité</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
            {canRedeemLoyaltyPoints(customer.loyalty_points, settings) ? (
              <>
                <p className="font-semibold text-success">Points utilisables en caisse</p>
                <p className="mt-2 text-muted">
                  Présentez votre carte en magasin pour une réduction d&apos;environ{" "}
                  <span className="font-medium text-foreground">
                    {formatCurrency(pointsValueInMad(customer.loyalty_points, settings))}
                  </span>
                  . {formatLoyaltyRedeemRule(settings)}.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-foreground">
                  Paiement avec points dès {settings.minPointsToRedeem} pts
                </p>
                <p className="mt-2 text-muted">
                  Encore{" "}
                  <span className="font-medium text-primary">
                    {pointsUntilRedemption(customer.loyalty_points, settings)} pts
                  </span>{" "}
                  pour utiliser vos points à la caisse.
                </p>
              </>
            )}
          </div>
          <p className="text-xs text-muted">{formatLoyaltyEarnRule(settings)}</p>
        </div>
      )}

      {tab === "historique" && (
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
      )}

      {tab === "factures" && (
        <div className="space-y-4">
          {selectedInvoice ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-2"
                onClick={() => setSelectedInvoice(null)}
              >
                <ArrowLeft className="h-4 w-4" />
                Retour aux factures
              </Button>
              <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                <PosInvoice data={publicInvoiceToDocumentData(selectedInvoice)} />
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold text-foreground">Mes factures</h2>
              {loadingInvoices ? (
                <p className="mt-4 text-sm text-muted">Chargement…</p>
              ) : invoices.length === 0 ? (
                <p className="mt-4 text-sm text-muted">
                  Aucune facture pour le moment. Vos achats en magasin apparaîtront ici.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {invoices.map((invoice) => {
                    const cancelled = Boolean(invoice.cancelled_at);
                    return (
                      <li key={invoice.id}>
                        <button
                          type="button"
                          disabled={cancelled || loadingInvoiceDetail}
                          onClick={() => void openInvoice(invoice.id)}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                            cancelled
                              ? "cursor-not-allowed border-border bg-page/50 opacity-60"
                              : "border-border bg-page/30 hover:border-primary/30 hover:bg-primary/5"
                          )}
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {saleDocumentNumber(invoice.id)}
                              {cancelled && " · Annulée"}
                            </p>
                            <p className="text-xs text-muted">
                              {formatDate(invoice.created_at)}
                              {invoice.store_name ? ` · ${invoice.store_name}` : ""}
                            </p>
                            <p className="text-xs text-muted">
                              {PAYMENT_METHOD_LABELS[invoice.payment_method as keyof typeof PAYMENT_METHOD_LABELS] ||
                                invoice.payment_method}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-primary">
                            {formatCurrency(Number(invoice.total))}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <Button
        type="button"
        variant="secondary"
        className="w-full gap-2"
        onClick={() => void refresh()}
        disabled={refreshing}
      >
        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        Actualiser
      </Button>
    </div>
  );
}
