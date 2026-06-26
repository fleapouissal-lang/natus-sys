"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BriefcaseBusiness,
  Crown,
  Eye,
  Search,
  Sparkles,
  Trash2,
  UserCheck,
  UserRound,
  UserX,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterTogglePanel } from "@/components/ui/filter-toggle-panel";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { LoyaltyTierBadge } from "@/components/loyalty/loyalty-tier-badge";
import { loyaltyTierFromPoints } from "@/lib/loyalty/tiers";
import {
  deleteLoyaltyCustomer,
  deleteProClientCustomer,
  toggleLoyaltyCustomerActive,
  toggleProClientActive,
} from "@/lib/actions";
import { formatDate } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/loyalty/phone";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import { cn } from "@/lib/utils";
import type { LoyaltyCustomer } from "@/lib/types";
import {
  PRO_CLIENT_DISCOUNT_PERCENT,
  PRO_PLUS_DISCOUNT_PERCENT,
  PRO_PLUS_LABEL,
  PRO_PLUS_TAGLINE,
} from "@/lib/pro-client/discount";

type ClientTab = "normal" | "pro" | "pro-plus";

function parseClientTab(tabParam: string | null, initialTab: ClientTab): ClientTab {
  if (tabParam === "pro-plus") return "pro-plus";
  if (tabParam === "pro") return "pro";
  if (initialTab === "pro-plus" || initialTab === "pro") return initialTab;
  return "normal";
}

const PRO_PLUS_BENEFITS = [
  `Remise caisse renforcée (${PRO_PLUS_DISCOUNT_PERCENT}% vs ${PRO_CLIENT_DISCOUNT_PERCENT}% Client Pro)`,
  "Accès prioritaire aux nouveautés et éditions limitées",
  "Conseiller Natus dédié pour commandes professionnelles",
  "Invitations événements et formations produits",
  "Conditions sur mesure pour volumes réguliers",
];

const COMPARISON_ROWS = [
  {
    label: "Remise en caisse",
    normal: "—",
    pro: `-${PRO_CLIENT_DISCOUNT_PERCENT}%`,
    plus: `-${PRO_PLUS_DISCOUNT_PERCENT}%`,
  },
  { label: "Points fidélité", normal: "Oui", pro: "Oui", plus: "Oui + bonus" },
  { label: "QR inscription magasin", normal: "—", pro: "Oui", plus: "Oui" },
  { label: "Accès prioritaire", normal: "—", pro: "—", plus: "Oui" },
  { label: "Conseiller dédié", normal: "—", pro: "—", plus: "Oui" },
];

function ProPlusProposalTab({
  proClients,
  detailBasePath,
}: {
  proClients: LoyaltyCustomer[];
  detailBasePath: string;
}) {
  const activeProClients = proClients.filter((c) => c.pro_client_active);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/25 bg-gradient-to-br from-champagne/30 via-surface to-surface">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <Badge variant="accent" className="mb-3 gap-1">
              <Sparkles className="h-3 w-3" />
              Proposition commerciale
            </Badge>
            <h2 className="font-heading text-2xl font-bold text-foreground">{PRO_PLUS_LABEL}</h2>
            <p className="mt-2 text-sm text-muted">{PRO_PLUS_TAGLINE}</p>
            <p className="mt-4 text-sm leading-relaxed text-foreground/90">
              Palier réservé aux clients Pro les plus engagés. Activation manuelle par le
              directeur après validation du profil et du volume d&apos;achat.
            </p>
          </div>
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Crown className="h-8 w-8" />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Avantages Pro Plus"
            description="Ce que ce palier apporte en plus du Client Pro"
          />
          <ul className="space-y-3">
            {PRO_PLUS_BENEFITS.map((benefit) => (
              <li key={benefit} className="flex gap-3 text-sm text-foreground">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Sparkles className="h-3 w-3" />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </Card>

        <Card padding={false}>
          <div className="border-b border-border px-6 py-4">
            <h3 className="text-lg font-semibold">Comparatif des offres</h3>
            <p className="mt-1 text-sm text-muted">Normal · Pro · Pro Plus</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-border bg-primary-light/30">
                  <th className="px-6 py-3 text-left font-medium text-muted">Avantage</th>
                  <th className="px-4 py-3 text-center font-medium text-muted">Normal</th>
                  <th className="px-4 py-3 text-center font-medium text-muted">Pro</th>
                  <th className="px-4 py-3 text-center font-medium text-primary">Pro Plus</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-border last:border-b-0">
                    <td className="px-6 py-3 text-foreground">{row.label}</td>
                    <td className="px-4 py-3 text-center text-muted">{row.normal}</td>
                    <td className="px-4 py-3 text-center text-muted">{row.pro}</td>
                    <td className="px-4 py-3 text-center font-semibold text-primary">{row.plus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card padding={false}>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold">Clients Pro éligibles</h3>
            <p className="mt-1 text-sm text-muted">
              {activeProClients.length} compte{activeProClients.length !== 1 ? "s" : ""} Pro actif
              {activeProClients.length !== 1 ? "s" : ""} · base pour une montée Pro Plus
            </p>
          </div>
          <Badge variant="warning">Activation Pro Plus — bientôt en caisse</Badge>
        </div>
        {activeProClients.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted">
            Aucun Client Pro actif pour le moment. Activez des comptes Pro pour préparer des
            montées Pro Plus.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-primary-light/20">
                  <th className="px-6 py-3 text-left font-medium text-muted">Client</th>
                  <th className="px-6 py-3 text-left font-medium text-muted">Entreprise</th>
                  <th className="px-6 py-3 text-left font-medium text-muted">Carte</th>
                  <th className="px-6 py-3 text-right font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeProClients.slice(0, 10).map((customer) => (
                  <tr key={customer.id} className="border-b border-border last:border-b-0">
                    <td className="px-6 py-4">
                      <p className="font-medium">{customer.full_name}</p>
                      <p className="text-xs text-muted">{formatPhoneDisplay(customer.phone)}</p>
                    </td>
                    <td className="px-6 py-4 text-muted">
                      {customer.company_name || customer.city || "—"}
                    </td>
                    <td className="px-6 py-4 font-mono">{customer.card_number}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end">
                        <Link
                          href={`${detailBasePath}/${customer.id}`}
                          title="Voir la fiche"
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

function useClientSearch(customers: LoyaltyCustomer[], search: string) {
  return useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.card_number.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (c.company_name?.toLowerCase().includes(q) ?? false)
    );
  }, [customers, search]);
}

export function DirectorClientsManager({
  normalClients,
  proClients,
  detailBasePath,
  initialTab = "normal",
}: {
  normalClients: LoyaltyCustomer[];
  proClients: LoyaltyCustomer[];
  detailBasePath: string;
  initialTab?: ClientTab;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab = parseClientTab(tabParam, initialTab);

  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filteredNormal = useClientSearch(normalClients, search);
  const filteredPro = useClientSearch(proClients, search);
  const filtered = tab === "pro" ? filteredPro : filteredNormal;

  const {
    paginated,
    page,
    setPage,
    totalPages,
    rangeStart,
    rangeEnd,
    totalItems,
  } = usePagination(filtered, DEFAULT_PAGE_SIZE, `${tab}-${search}`);

  const pendingProCount = proClients.filter((c) => !c.pro_client_active).length;
  const activeProCount = proClients.filter((c) => c.pro_client_active).length;
  const inactiveNormalCount = normalClients.filter((c) => c.is_active === false).length;

  function setTab(next: ClientTab) {
    setSearch("");
    router.replace(`/director/clients?tab=${next}`, { scroll: false });
  }

  function runAction(customerId: string, action: () => Promise<{ error?: string } | { success: true }>) {
    setLoadingId(customerId);
    startTransition(async () => {
      const result = await action();
      if ("error" in result && result.error) {
        window.alert(result.error);
      } else {
        router.refresh();
      }
      setLoadingId(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("normal")}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
            tab === "normal"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border bg-surface text-muted hover:border-primary/30 hover:text-primary"
          )}
        >
          <UserRound className="h-4 w-4" />
          Client normal
          <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs">{normalClients.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("pro")}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
            tab === "pro"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border bg-surface text-muted hover:border-primary/30 hover:text-primary"
          )}
        >
          <BriefcaseBusiness className="h-4 w-4" />
          Client Pro
          <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs">{proClients.length}</span>
          {pendingProCount > 0 && (
            <span className="rounded-full bg-warning/20 px-2 py-0.5 text-xs text-warning">
              {pendingProCount} en attente
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab("pro-plus")}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
            tab === "pro-plus"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border bg-surface text-muted hover:border-primary/30 hover:text-primary"
          )}
        >
          <Crown className="h-4 w-4" />
          Pro Plus
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            Proposition
          </span>
        </button>
      </div>

      <p className="text-sm text-muted">
        {tab === "normal"
          ? `${normalClients.length} client${normalClients.length !== 1 ? "s" : ""} fidélité${inactiveNormalCount > 0 ? ` · ${inactiveNormalCount} désactivé${inactiveNormalCount !== 1 ? "s" : ""}` : ""}`
          : tab === "pro"
            ? `${proClients.length} compte${proClients.length !== 1 ? "s" : ""} pro · ${pendingProCount} en attente d'activation`
            : `${PRO_PLUS_LABEL} · remise proposée ${PRO_PLUS_DISCOUNT_PERCENT}% · ${activeProCount} client${activeProCount !== 1 ? "s" : ""} Pro éligible${activeProCount !== 1 ? "s" : ""}`}
      </p>

      {tab === "pro-plus" ? (
        <ProPlusProposalTab proClients={proClients} detailBasePath={detailBasePath} />
      ) : (
        <>
      <FilterTogglePanel
        toggleLabel="Filtrer les clients"
        summary={`${filtered.length} résultat${filtered.length !== 1 ? "s" : ""}`}
      >
        <div className="natus-filter-bar overflow-visible p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                tab === "pro"
                  ? "Nom, entreprise, téléphone, carte…"
                  : "Nom, téléphone, carte FID…"
              }
              className="natus-field w-full bg-surface py-0 pl-10 pr-3 text-sm"
            />
          </div>
        </div>
      </FilterTogglePanel>

      <Card padding={false}>
        <div className="overflow-x-auto">
          {tab === "normal" ? (
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b border-border bg-primary-light/40">
                  <th className="px-6 py-3 text-left font-medium text-muted">Client</th>
                  <th className="px-6 py-3 text-left font-medium text-muted">Carte</th>
                  <th className="px-6 py-3 text-left font-medium text-muted">Statut</th>
                  <th className="px-6 py-3 text-right font-medium text-muted">Points</th>
                  <th className="px-6 py-3 text-left font-medium text-muted">Adhésion</th>
                  <th className="px-6 py-3 text-right font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((customer) => {
                  const tier = loyaltyTierFromPoints(customer.loyalty_points);
                  const isActive = customer.is_active !== false;
                  const label = customer.full_name || customer.phone;
                  return (
                    <tr key={customer.id} className="border-b border-border last:border-b-0">
                      <td className="px-6 py-4">
                        <p className="font-medium">{customer.full_name}</p>
                        <p className="text-xs text-muted">{formatPhoneDisplay(customer.phone)}</p>
                      </td>
                      <td className="px-6 py-4 font-mono">{customer.card_number}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <LoyaltyTierBadge tier={tier} />
                          {!isActive && <Badge variant="warning">Désactivé</Badge>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-primary">
                        {customer.loyalty_points}
                      </td>
                      <td className="px-6 py-4 text-muted">{formatDate(customer.created_at)}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`${detailBasePath}/${customer.id}`}
                            title="Voir la fiche"
                            className="order-action-icon flex h-8 w-8 items-center justify-center border border-primary/30 bg-page text-primary hover:bg-primary-light"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          {isActive ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              loading={pending && loadingId === customer.id}
                              onClick={() => {
                                if (!window.confirm(`Désactiver le client ${label} ?`)) return;
                                runAction(customer.id, () =>
                                  toggleLoyaltyCustomerActive(customer.id, false)
                                );
                              }}
                              title="Désactiver"
                            >
                              <UserX className="h-4 w-4 text-warning" />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              loading={pending && loadingId === customer.id}
                              onClick={() =>
                                runAction(customer.id, () =>
                                  toggleLoyaltyCustomerActive(customer.id, true)
                                )
                              }
                              title="Réactiver"
                            >
                              <UserCheck className="h-4 w-4 text-success" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            loading={pending && loadingId === customer.id}
                            onClick={() => {
                              if (
                                !window.confirm(
                                  `Supprimer définitivement ${label} ?\n\nSi le client a de l'historique de ventes, la suppression échouera.`
                                )
                              ) {
                                return;
                              }
                              runAction(customer.id, () => deleteLoyaltyCustomer(customer.id));
                            }}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4 text-danger" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted">
                      Aucun client normal trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b border-border bg-primary-light/40">
                  <th className="px-6 py-3 text-left font-medium text-muted">Client</th>
                  <th className="px-6 py-3 text-left font-medium text-muted">Type</th>
                  <th className="px-6 py-3 text-left font-medium text-muted">Entreprise / Ville</th>
                  <th className="px-6 py-3 text-left font-medium text-muted">Carte</th>
                  <th className="px-6 py-3 text-left font-medium text-muted">Statut</th>
                  <th className="px-6 py-3 text-left font-medium text-muted">Inscrit le</th>
                  <th className="px-6 py-3 text-right font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((customer) => {
                  const label = customer.full_name || customer.phone;
                  const isActive = Boolean(customer.pro_client_active);
                  const isEntreprise = customer.pro_client_type === "entreprise";
                  return (
                    <tr key={customer.id} className="border-b border-border last:border-b-0">
                      <td className="px-6 py-4">
                        <p className="font-medium">{customer.full_name}</p>
                        <p className="text-xs text-muted">{formatPhoneDisplay(customer.phone)}</p>
                        {customer.address && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted">{customer.address}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={isEntreprise ? "default" : "accent"}>
                          {isEntreprise ? "Entreprise" : "Particulier"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-muted">
                        {isEntreprise ? (
                          <>
                            <p>{customer.company_name || "—"}</p>
                            <p className="text-xs">{customer.city || "—"}</p>
                          </>
                        ) : (
                          <span>{customer.city || customer.email || "—"}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono">{customer.card_number}</td>
                      <td className="px-6 py-4">
                        <Badge variant={isActive ? "success" : "warning"}>
                          {isActive ? "Actif" : "En attente"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-muted">{formatDate(customer.created_at)}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`${detailBasePath}/${customer.id}`}
                            title="Voir la fiche"
                            className="order-action-icon flex h-8 w-8 items-center justify-center border border-primary/30 bg-page text-primary hover:bg-primary-light"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          {!isActive ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              loading={pending && loadingId === customer.id}
                              onClick={() =>
                                runAction(customer.id, () =>
                                  toggleProClientActive(customer.id, true)
                                )
                              }
                              title="Activer"
                            >
                              <UserCheck className="h-4 w-4 text-success" />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              loading={pending && loadingId === customer.id}
                              onClick={() => {
                                if (!window.confirm(`Désactiver le compte Client Pro de ${label} ?`)) {
                                  return;
                                }
                                runAction(customer.id, () =>
                                  toggleProClientActive(customer.id, false)
                                );
                              }}
                              title="Désactiver"
                            >
                              <UserX className="h-4 w-4 text-warning" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            loading={pending && loadingId === customer.id}
                            onClick={() => {
                              if (
                                !window.confirm(
                                  `Supprimer définitivement ${label} ?\n\nSi le client a de l'historique de ventes, la suppression échouera.`
                                )
                              ) {
                                return;
                              }
                              runAction(customer.id, () => deleteProClientCustomer(customer.id));
                            }}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4 text-danger" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted">
                      Aucun compte Client Pro trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        {filtered.length > 0 && (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            totalItems={totalItems}
            onPageChange={setPage}
          />
        )}
      </Card>
        </>
      )}
    </div>
  );
}
