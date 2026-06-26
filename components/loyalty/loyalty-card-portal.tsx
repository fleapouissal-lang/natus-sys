"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  UserRound,
  ChevronRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Receipt,
  ShieldCheck,
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
import { loyaltyTierFromPoints, loyaltyTierLabel } from "@/lib/loyalty/tiers";
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

function ClientTypeBadge({
  isPro,
  isProActive,
  companyName,
  compact = false,
}: {
  isPro: boolean;
  isProActive: boolean;
  companyName?: string | null;
  compact?: boolean;
}) {
  if (isPro) {
    return (
      <div className="flex flex-col items-start gap-1">
        <span
          className={cn(
            "loyalty-portal-badge",
            isProActive ? "loyalty-portal-badge--active" : "loyalty-portal-badge--pending"
          )}
        >
          <BriefcaseBusiness className="h-3 w-3" />
          Client Pro{isProActive ? "" : " · en attente"}
        </span>
        {companyName && !compact && (
          <span className="text-[11px] tracking-wide text-black/50">{companyName}</span>
        )}
      </div>
    );
  }

  return (
    <span className="loyalty-portal-badge">
      <UserRound className="h-3 w-3" />
      Client fidélité
    </span>
  );
}

function SidebarMetric({
  label,
  value,
  gold,
}: {
  label: string;
  value: string;
  gold?: boolean;
}) {
  return (
    <div className="loyalty-portal-metric-row">
      <span className="loyalty-portal-metric-label">{label}</span>
      <span className={cn("loyalty-portal-metric-value", gold && "loyalty-portal-metric-value--gold")}>
        {value}
      </span>
    </div>
  );
}

function EmptySection({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof History;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-7 w-7" />
      </div>
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-2 max-w-xs text-sm text-muted">{description}</p>
    </div>
  );
}

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
  const firstName = customer.full_name.trim().split(/\s+/)[0] || "Client";
  const initial = firstName.charAt(0).toUpperCase();
  const tier = loyaltyTierFromPoints(customer.loyalty_points);
  const redeemEligible = canRedeemLoyaltyPoints(customer.loyalty_points, settings);
  const pointsRemaining = pointsUntilRedemption(customer.loyalty_points, settings);
  const progressToRedeem = useMemo(() => {
    if (redeemEligible) return 100;
    const target = settings.minPointsToRedeem;
    if (target <= 0) return 0;
    return Math.min(100, Math.round((customer.loyalty_points / target) * 100));
  }, [customer.loyalty_points, redeemEligible, settings.minPointsToRedeem]);

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

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/loyalty/card/${customer.qr_token}`);
      if (!res.ok) return;
      const data = await res.json();
      setCustomer((prev) => ({ ...prev, ...data.customer }));
      setTransactions(data.transactions);
      if (data.settings) setSettings(data.settings);
      if (tab === "factures") void loadInvoices();
    } finally {
      setRefreshing(false);
    }
  }, [customer.qr_token, tab, loadInvoices]);

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

  function switchTab(id: PortalTab) {
    setTab(id);
    setSelectedInvoice(null);
  }

  return (
    <div className="loyalty-client-portal flex min-h-[100dvh] w-full">
      <aside
        className={cn(
          "natus-sidebar loyalty-client-portal-sidebar loyalty-client-portal-sidebar--compact",
          "flex w-[4.5rem] shrink-0 flex-col md:w-72"
        )}
      >
        <div className="loyalty-portal-brand flex shrink-0 flex-col px-3 py-5 md:px-5 md:py-6">
          <span className="font-heading text-xl font-bold tracking-[0.04em] text-black md:text-[1.65rem]">
            <span className="md:hidden">N</span>
            <span className="hidden md:inline">Natus</span>
          </span>
          <p className="mt-2 hidden text-[10px] font-semibold uppercase tracking-[0.28em] text-black/45 md:block">
            Espace client
          </p>
        </div>

        <div className="loyalty-portal-sidebar-divider hidden md:block" />

        <div className="hidden shrink-0 px-2 py-4 md:block">
          <div className="loyalty-portal-profile-card">
            <div className="flex items-start gap-3">
              <div className="loyalty-portal-avatar h-12 w-12 shrink-0 text-base">{initial}</div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="truncate font-heading text-base font-semibold capitalize text-black">
                  {customer.full_name}
                </p>
                <p className="mt-1 font-mono text-[10px] tracking-[0.14em] text-black/45">
                  {customer.card_number}
                </p>
                <div className="mt-2.5">
                  <ClientTypeBadge
                    isPro={isPro}
                    isProActive={isProActive}
                    companyName={customer.company_name}
                  />
                </div>
              </div>
            </div>

            <div className="loyalty-portal-metrics">
              <SidebarMetric
                label="Points"
                value={String(customer.loyalty_points)}
                gold
              />
              <SidebarMetric label="Statut" value={loyaltyTierLabel(tier)} />
              <SidebarMetric
                label={isPro ? "Remise Pro" : "Valeur"}
                value={
                  isProActive
                    ? `-${PRO_CLIENT_DISCOUNT_PERCENT}%`
                    : formatCurrency(pointsValueInMad(customer.loyalty_points, settings))
                }
                gold={isProActive}
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-center py-3 md:hidden">
          <div className="loyalty-portal-avatar h-10 w-10 text-sm">{initial}</div>
        </div>

        <div className="loyalty-portal-sidebar-divider hidden md:block" />

        <p className="hidden px-5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/40 md:block">
          Navigation
        </p>

        <nav className="natus-sidebar-nav min-h-0 flex-1">
          <ul className="m-0 flex list-none flex-col items-center gap-1 p-0 md:items-stretch md:gap-0 md:pr-1">
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive = tab === id;
              return (
                <li
                  key={id}
                  className={cn(
                    "natus-nav-item flex w-full justify-center md:block",
                    isActive && "natus-nav-item-active"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => switchTab(id)}
                    title={label}
                    className={cn(
                      "natus-nav-link flex h-10 w-10 items-center justify-center md:h-auto md:w-full md:justify-start",
                      isActive && "natus-nav-link-active"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 shrink-0",
                        isActive ? "text-primary" : "text-black"
                      )}
                    />
                    <span className="hidden md:inline">{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0 px-2 pb-3 pt-1 md:px-4 md:pb-4">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing}
              title="Actualiser"
              className="loyalty-portal-sidebar-footer-btn flex h-10 w-full items-center justify-center gap-2 disabled:opacity-50 md:px-3 md:py-2.5"
            >
              <RefreshCw className={cn("h-4 w-4 shrink-0", refreshing && "animate-spin")} />
              <span className="hidden text-sm font-medium md:inline">Actualiser</span>
            </button>
            <button
              type="button"
              onClick={() => void shareLink()}
              title="Partager"
              className="loyalty-portal-sidebar-footer-btn loyalty-portal-sidebar-footer-btn--primary flex h-10 w-full items-center justify-center gap-2 md:px-3 md:py-2.5"
            >
              <Share2 className="h-4 w-4 shrink-0" />
              <span className="hidden text-sm font-medium md:inline">Partager ma carte</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="loyalty-client-portal-main flex min-w-0 flex-1 flex-col">
        <header className="border-b border-primary/10 bg-page px-4 py-4 md:hidden">
          <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-champagne/25 via-surface to-surface p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="loyalty-portal-avatar h-11 w-11 shrink-0 text-sm">{initial}</div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate font-heading text-base font-semibold capitalize text-foreground">
                  {customer.full_name}
                </h1>
                <p className="mt-1 font-mono text-[10px] tracking-[0.12em] text-muted">
                  {customer.card_number}
                </p>
                <div className="mt-2">
                  <ClientTypeBadge
                    isPro={isPro}
                    isProActive={isProActive}
                    companyName={customer.company_name}
                    compact
                  />
                </div>
              </div>
            </div>
            <div className="loyalty-portal-metrics mt-3 border-primary/10">
              <SidebarMetric
                label="Points"
                value={String(customer.loyalty_points)}
                gold
              />
              <SidebarMetric
                label={isPro ? "Remise Pro" : "Valeur"}
                value={
                  isProActive
                    ? `-${PRO_CLIENT_DISCOUNT_PERCENT}%`
                    : formatCurrency(pointsValueInMad(customer.loyalty_points, settings))
                }
                gold={isProActive}
              />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-2xl">
            <div className="mb-6 hidden md:block">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {TABS.find((t) => t.id === tab)?.label}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {tab === "carte" && "Votre carte fidélité et accès magasin"}
                {tab === "points" && "Solde et progression de vos points"}
                {tab === "historique" && "Mouvements de points en boutique"}
                {tab === "factures" && "Tickets et factures de vos achats"}
              </p>
            </div>

        {tab === "carte" && (
          <div className="space-y-5 animate-fade-in">
            <LoyaltyWalletCard customer={customer} />

            {isPro && !isProActive && (
              <div className="flex gap-3 rounded-2xl border border-warning/30 bg-warning/5 p-4 text-sm">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                <div>
                  <p className="font-medium text-foreground">Activation Client Pro</p>
                  <p className="mt-1 text-muted">
                    Votre compte sera activé par l&apos;équipe Natus. La remise de{" "}
                    {PRO_CLIENT_DISCOUNT_PERCENT}% s&apos;appliquera en caisse dès validation.
                  </p>
                </div>
              </div>
            )}

            {isProActive && (
              <div className="flex gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4 text-sm">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-medium text-primary">Avantage Client Pro actif</p>
                  <p className="mt-1 text-muted">
                    Présentez votre carte en magasin pour bénéficier automatiquement de{" "}
                    {PRO_CLIENT_DISCOUNT_PERCENT}% de remise sur vos achats.
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-sm font-semibold text-foreground">Comment utiliser ma carte</p>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li className="flex gap-2">
                  <span className="text-primary">1.</span>
                  Présentez le code-barres en caisse Natus
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">2.</span>
                  Cumulez et utilisez vos points fidélité
                </li>
                {isPro && (
                  <li className="flex gap-2">
                    <span className="text-primary">3.</span>
                    Remise professionnelle appliquée si compte actif
                  </li>
                )}
              </ul>
            </div>

            <LoyaltyCardInstall token={customer.qr_token} />

            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="secondary" className="gap-2 md:hidden" onClick={() => void shareLink()}>
                <Share2 className="h-4 w-4" />
                Partager
              </Button>
              <Button type="button" variant="secondary" className="gap-2" onClick={() => void copyLink()}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copié" : "Copier le lien"}
              </Button>
            </div>
          </div>
        )}

        {tab === "points" && (
          <div className="space-y-5 animate-fade-in">
            <div className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/15 to-surface p-6 text-center shadow-sm">
              <p className="text-xs font-medium uppercase tracking-widest text-muted">Solde fidélité</p>
              <p className="mt-2 font-heading text-5xl font-bold tabular-nums text-primary">
                {customer.loyalty_points}
              </p>
              <p className="mt-1 text-sm text-muted">points</p>
              <p className="mt-3 text-sm font-medium text-foreground">
                ≈ {formatCurrency(pointsValueInMad(customer.loyalty_points, settings))} en caisse
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-foreground">
                  {redeemEligible ? "Seuil atteint" : "Progression vers utilisation"}
                </span>
                <span className="text-muted">
                  {customer.loyalty_points} / {settings.minPointsToRedeem} pts
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-page">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progressToRedeem}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-muted">
                {redeemEligible ? (
                  <>
                    <span className="font-medium text-success">Points utilisables en caisse.</span>{" "}
                    {formatLoyaltyRedeemRule(settings)}.
                  </>
                ) : (
                  <>
                    Encore{" "}
                    <span className="font-semibold text-primary">{pointsRemaining} pts</span> pour
                    payer avec vos points.
                  </>
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-4 text-sm text-muted">
              <p className="font-medium text-foreground">Comment gagner des points</p>
              <p className="mt-1">{formatLoyaltyEarnRule(settings)}</p>
            </div>
          </div>
        )}

        {tab === "historique" && (
          <div className="rounded-2xl border border-border bg-surface shadow-sm animate-fade-in">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-foreground">Historique des points</h2>
              <p className="mt-0.5 text-xs text-muted">Gains et utilisations en magasin</p>
            </div>
            {transactions.length === 0 ? (
              <EmptySection
                icon={History}
                title="Aucun mouvement"
                description="Vos points apparaîtront ici après votre premier achat en boutique Natus."
              />
            ) : (
              <ul className="divide-y divide-border">
                {transactions.map((tx) => {
                  const isEarn = tx.type === "earn";
                  return (
                    <li key={tx.id} className="flex items-start gap-3 px-5 py-4">
                      <div
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                          isEarn ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                        )}
                      >
                        {isEarn ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {isEarn ? "Points gagnés" : "Points utilisés"}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {tx.description || "Mouvement fidélité"}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">{formatDate(tx.created_at)}</p>
                      </div>
                      <p
                        className={cn(
                          "shrink-0 text-sm font-bold tabular-nums",
                          isEarn ? "text-success" : "text-danger"
                        )}
                      >
                        {isEarn ? "+" : "-"}
                        {tx.points}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {tab === "factures" && (
          <div className="space-y-4 animate-fade-in">
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
                <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
                  <PosInvoice data={publicInvoiceToDocumentData(selectedInvoice)} />
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-border bg-surface shadow-sm">
                <div className="border-b border-border px-5 py-4">
                  <h2 className="text-sm font-semibold text-foreground">Mes factures</h2>
                  <p className="mt-0.5 text-xs text-muted">Achats enregistrés en magasin</p>
                </div>
                {loadingInvoices ? (
                  <div className="space-y-2 p-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-16 animate-pulse rounded-xl bg-page"
                      />
                    ))}
                  </div>
                ) : invoices.length === 0 ? (
                  <EmptySection
                    icon={Receipt}
                    title="Aucune facture"
                    description="Vos tickets et factures d'achat apparaîtront ici après passage en caisse."
                  />
                ) : (
                  <ul className="divide-y divide-border">
                    {invoices.map((invoice) => {
                      const cancelled = Boolean(invoice.cancelled_at);
                      return (
                        <li key={invoice.id}>
                          <button
                            type="button"
                            disabled={cancelled || loadingInvoiceDetail}
                            onClick={() => void openInvoice(invoice.id)}
                            className={cn(
                              "flex w-full items-center gap-3 px-5 py-4 text-left transition-colors",
                              cancelled
                                ? "cursor-not-allowed opacity-50"
                                : "hover:bg-primary/5"
                            )}
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground">
                                Facture {saleDocumentNumber(invoice.id)}
                                {cancelled && (
                                  <span className="ml-1 text-xs text-danger">· Annulée</span>
                                )}
                              </p>
                              <p className="text-xs text-muted">
                                {formatDate(invoice.created_at)}
                                {invoice.store_name ? ` · ${invoice.store_name}` : ""}
                              </p>
                              <p className="text-xs text-muted">
                                {PAYMENT_METHOD_LABELS[
                                  invoice.payment_method as keyof typeof PAYMENT_METHOD_LABELS
                                ] || invoice.payment_method}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="text-sm font-bold text-primary tabular-nums">
                                {formatCurrency(Number(invoice.total))}
                              </span>
                              {!cancelled && (
                                <ChevronRight className="h-4 w-4 text-muted" />
                              )}
                            </div>
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
          </div>
        </main>

        <footer className="hidden border-t border-border/60 px-8 py-4 text-center text-[10px] text-muted md:block">
          Lien personnel · sans mot de passe · Natus Cosmétiques
        </footer>
      </div>
    </div>
  );
}
