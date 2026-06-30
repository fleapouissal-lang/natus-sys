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
import { customerCardUrl } from "@/lib/loyalty/qr";
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
import { isProParticulierCustomer } from "@/lib/pro-client/account-type";
import { DEFAULT_LOYALTY_SETTINGS } from "@/lib/loyalty/config";
import { LoyaltyCustomerPortalOrdersList } from "@/components/loyalty/loyalty-customer-sales-section";
import type { CustomerSaleDetail, CustomerSaleSummary } from "@/lib/loyalty/customer-sales";
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

const TABS: { id: PortalTab; label: string; short: string; icon: typeof CreditCard }[] = [
  { id: "carte", label: "Ma carte", short: "Carte", icon: CreditCard },
  { id: "points", label: "Mes points", short: "Points", icon: Coins },
  { id: "historique", label: "Historique", short: "Historique", icon: History },
  { id: "factures", label: "Factures", short: "Factures", icon: FileText },
];

function tabDescription(tab: PortalTab, isPro: boolean): string {
  switch (tab) {
    case "carte":
      return "Votre carte fidélité et accès magasin";
    case "points":
      return "Solde et progression de vos points";
    case "historique":
      return isPro
        ? "Tous vos achats en magasin avec ce compte Client Pro"
        : "Mouvements de points en boutique";
    case "factures":
      return "Tickets et factures de vos achats";
  }
}

function ClientPortalMobileTopBar({
  initial,
  refreshing,
  onRefresh,
  onShare,
}: {
  initial: string;
  refreshing: boolean;
  onRefresh: () => void;
  onShare: () => void;
}) {
  return (
    <header className="natus-mobile-topbar-shell shrink-0 md:hidden">
      <div className="natus-mobile-topbar-pill">
        <div className="natus-mobile-topbar-brand min-w-0 flex flex-1 items-center gap-2.5">
          <div className="loyalty-portal-avatar natus-mobile-topbar-mark h-9 w-9 text-sm">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="natus-mobile-topbar-logo">Natus</p>
            <p className="natus-mobile-topbar-subtitle">Espace client</p>
          </div>
        </div>
        <div className="natus-mobile-topbar-actions flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="natus-mobile-topbar-action"
            aria-label="Actualiser"
            title="Actualiser"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </button>
          <button
            type="button"
            onClick={onShare}
            className="natus-mobile-topbar-action"
            aria-label="Partager ma carte"
            title="Partager"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

function ClientPortalMobileBottomNav({
  tab,
  onTabChange,
  visibleTabs,
}: {
  tab: PortalTab;
  onTabChange: (tab: PortalTab) => void;
  visibleTabs: typeof TABS;
}) {
  return (
    <div className="natus-mobile-bottom-nav-shell md:hidden">
      <nav
        className="natus-mobile-bottom-nav overflow-hidden rounded-t-[1.5rem] rounded-b-none"
        aria-label="Navigation espace client"
      >
        <ul className="natus-mobile-bottom-nav-list">
          {visibleTabs.map(({ id, short, icon: Icon }) => {
            const isActive = tab === id;
            return (
              <li key={id} className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onTabChange(id)}
                  className={cn(
                    "natus-mobile-nav-link w-full",
                    isActive && "natus-mobile-nav-link--active"
                  )}
                >
                  <span className="natus-mobile-nav-icon">
                    <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" />
                  </span>
                  <span className="max-w-full truncate px-0.5">{short}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

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
  initialTab,
}: {
  initialCustomer: LoyaltyCustomer;
  initialTransactions: PublicLoyaltyTransaction[];
  loyaltySettings?: LoyaltySettings;
  initialTab?: PortalTab;
}) {
  const [tab, setTab] = useState<PortalTab>(initialTab || "carte");
  const [customer, setCustomer] = useState(initialCustomer);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [settings, setSettings] = useState(loyaltySettings);
  const [invoices, setInvoices] = useState<PublicCustomerInvoice[]>([]);
  const [orders, setOrders] = useState<CustomerSaleSummary[]>([]);
  const [selectedInvoice, setSelectedInvoice] =
    useState<PublicCustomerInvoiceDetail | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<CustomerSaleDetail | null>(null);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingInvoiceDetail, setLoadingInvoiceDetail] = useState(false);

  const isPro = Boolean(customer.is_pro_client);
  const cardUrl = customerCardUrl(customer.qr_token, isPro);
  const isProActive = Boolean(customer.is_pro_client && customer.pro_client_active);
  const isProParticulier = isProParticulierCustomer(customer);
  const visibleTabs = useMemo(() => {
    if (isProParticulier) {
      return TABS.filter((item) => item.id === "carte" || item.id === "historique");
    }
    if (isPro) {
      return TABS.filter((item) => item.id !== "points");
    }
    return TABS;
  }, [isPro, isProParticulier]);
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

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch(`/api/loyalty/card/${customer.qr_token}/orders`);
      if (!res.ok) return;
      const data = await res.json();
      setOrders(data.orders || []);
    } finally {
      setLoadingOrders(false);
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
      if (tab === "historique" && isPro) void loadOrders();
    } finally {
      setRefreshing(false);
    }
  }, [customer.qr_token, tab, isPro, loadInvoices, loadOrders]);

  useEffect(() => {
    if (isPro && tab === "points") {
      setTab("carte");
    }
    if (isProParticulier && tab === "factures") {
      setTab("historique");
    }
  }, [isPro, isProParticulier, tab]);

  useEffect(() => {
    if (tab === "factures") {
      void loadInvoices();
    }
    if (tab === "historique" && isPro) {
      void loadOrders();
    }
  }, [tab, isPro, loadInvoices, loadOrders]);

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
          text: isProActive
            ? `${customer.full_name} — remise Client Pro ${PRO_CLIENT_DISCOUNT_PERCENT}%`
            : `${customer.full_name} — ${customer.loyalty_points} points`,
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
    setSelectedOrder(null);
  }

  return (
    <div className="loyalty-client-portal flex min-h-[100dvh] w-full flex-col md:flex-row">
      <aside className="natus-sidebar loyalty-client-portal-sidebar hidden w-72 shrink-0 flex-col md:flex">
        <div className="loyalty-portal-brand flex shrink-0 flex-col px-5 py-6">
          <span className="font-heading text-[1.65rem] font-bold tracking-[0.04em] text-black">
            Natus
          </span>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-black/45">
            Espace client
          </p>
        </div>

        <div className="loyalty-portal-sidebar-divider" />

        <div className="shrink-0 px-2 py-4">
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
              {isPro ? (
                <>
                  <SidebarMetric
                    label="Remise Pro"
                    value={
                      isProActive
                        ? `-${PRO_CLIENT_DISCOUNT_PERCENT}%`
                        : "En attente d'activation"
                    }
                    gold
                  />
                  <SidebarMetric
                    label="Statut compte"
                    value={isProActive ? "Actif" : "En attente"}
                  />
                </>
              ) : (
                <>
                  <SidebarMetric
                    label="Points"
                    value={String(customer.loyalty_points)}
                    gold
                  />
                  <SidebarMetric label="Statut" value={loyaltyTierLabel(tier)} />
                  <SidebarMetric
                    label="Valeur"
                    value={formatCurrency(pointsValueInMad(customer.loyalty_points, settings))}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        <div className="loyalty-portal-sidebar-divider" />

        <p className="px-5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/40">
          Navigation
        </p>

        <nav className="natus-sidebar-nav min-h-0 flex-1">
          <ul className="m-0 list-none p-0 pr-1">
            {visibleTabs.map(({ id, label, icon: Icon }) => {
              const isActive = tab === id;
              return (
                <li
                  key={id}
                  className={cn("natus-nav-item", isActive && "natus-nav-item-active")}
                >
                  <button
                    type="button"
                    onClick={() => switchTab(id)}
                    title={label}
                    className={cn("natus-nav-link", isActive && "natus-nav-link-active")}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 shrink-0",
                        isActive ? "text-primary" : "text-black"
                      )}
                    />
                    <span>{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0 px-4 pb-4 pt-1">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing}
              title="Actualiser"
              className="loyalty-portal-sidebar-footer-btn flex h-10 w-full items-center justify-center gap-2 disabled:opacity-50 px-3 py-2.5"
            >
              <RefreshCw className={cn("h-4 w-4 shrink-0", refreshing && "animate-spin")} />
              <span className="text-sm font-medium">Actualiser</span>
            </button>
            <button
              type="button"
              onClick={() => void shareLink()}
              title="Partager"
              className="loyalty-portal-sidebar-footer-btn loyalty-portal-sidebar-footer-btn--primary flex h-10 w-full items-center justify-center gap-2 px-3 py-2.5"
            >
              <Share2 className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">Partager ma carte</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="loyalty-client-portal-main flex min-w-0 flex-1 flex-col">
        <ClientPortalMobileTopBar
          initial={initial}
          refreshing={refreshing}
          onRefresh={() => void refresh()}
          onShare={() => void shareLink()}
        />

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
              {isPro ? (
                <>
                  <SidebarMetric
                    label="Remise Pro"
                    value={
                      isProActive
                        ? `-${PRO_CLIENT_DISCOUNT_PERCENT}%`
                        : "En attente d'activation"
                    }
                    gold
                  />
                  <SidebarMetric
                    label="Statut compte"
                    value={isProActive ? "Actif" : "En attente"}
                  />
                </>
              ) : (
                <>
                  <SidebarMetric
                    label="Points"
                    value={String(customer.loyalty_points)}
                    gold
                  />
                  <SidebarMetric
                    label="Valeur"
                    value={formatCurrency(pointsValueInMad(customer.loyalty_points, settings))}
                  />
                </>
              )}
            </div>
          </div>
        </header>

        <main className="natus-main-mobile-nav min-h-0 flex-1 overflow-y-auto p-4 md:p-8">
          <div className="w-full">
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {visibleTabs.find((t) => t.id === tab)?.label ??
                  TABS.find((t) => t.id === tab)?.label}
              </h2>
              <p className="mt-1 text-sm text-muted">{tabDescription(tab, isPro)}</p>
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
                {isPro ? (
                  <li className="flex gap-2">
                    <span className="text-primary">2.</span>
                    Bénéficiez de {PRO_CLIENT_DISCOUNT_PERCENT}% de remise professionnelle
                    {isProActive ? " (compte actif)" : " après activation"}
                  </li>
                ) : (
                  <li className="flex gap-2">
                    <span className="text-primary">2.</span>
                    Cumulez et utilisez vos points fidélité
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

        {tab === "points" && !isPro && (
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

        {tab === "historique" && !isPro && (
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

        {tab === "factures" && !isProParticulier && (
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
                  <p className="mt-0.5 text-xs text-muted">
                    Factures validées par notre équipe — visibles dès validation
                  </p>
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
                    description="Vos factures apparaîtront ici une fois validées par notre équipe."
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

        {tab === "historique" && isPro && (
          <LoyaltyCustomerPortalOrdersList
            orders={orders}
            loading={loadingOrders}
            qrToken={customer.qr_token}
            selectedOrder={selectedOrder}
            onSelectOrder={setSelectedOrder}
            onBack={() => setSelectedOrder(null)}
          />
        )}
          </div>
            <div className="natus-mobile-nav-spacer md:hidden" aria-hidden />
        </main>

        <footer className="hidden border-t border-border/60 px-8 py-4 text-center text-[10px] text-muted md:block">
          Lien personnel · sans mot de passe · Natus Cosmétiques
        </footer>

        <ClientPortalMobileBottomNav
          tab={tab}
          onTabChange={switchTab}
          visibleTabs={visibleTabs}
        />
      </div>
    </div>
  );
}
