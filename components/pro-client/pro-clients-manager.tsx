"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BriefcaseBusiness, Eye, Trash2, UserCheck, UserX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteProClientCustomer, toggleProClientActive } from "@/lib/actions";
import { formatDate } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/loyalty/phone";
import type { LoyaltyCustomer } from "@/lib/types";

export function ProClientsManager({
  customers,
  detailBasePath,
}: {
  customers: LoyaltyCustomer[];
  detailBasePath: string;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const pendingCount = customers.filter((c) => !c.pro_client_active).length;

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

  function handleActivate(customerId: string) {
    runAction(customerId, () => toggleProClientActive(customerId, true));
  }

  function handleDeactivate(customerId: string, label: string) {
    if (!window.confirm(`Désactiver le compte Client Pro de ${label} ?`)) return;
    runAction(customerId, () => toggleProClientActive(customerId, false));
  }

  function handleDelete(customerId: string, label: string) {
    if (
      !window.confirm(
        `Supprimer définitivement ${label} ?\n\nSi le client a de l'historique de ventes, la suppression échouera.`
      )
    ) {
      return;
    }
    runAction(customerId, () => deleteProClientCustomer(customerId));
  }

  return (
    <Card padding={false}>
      <div className="border-b border-border px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BriefcaseBusiness className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Comptes Client Pro</h2>
            </div>
            <p className="mt-1 text-sm text-muted">
              {customers.length} compte{customers.length !== 1 ? "s" : ""} · {pendingCount} en
              attente d&apos;activation
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
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
            {customers.map((customer) => {
              const label = customer.full_name || customer.phone;
              const isActive = Boolean(customer.pro_client_active);
              const isEntreprise = customer.pro_client_type === "entreprise";
              return (
                <tr key={customer.id} className="border-b border-border last:border-b-0">
                  <td className="px-6 py-4">
                    <p className="font-medium">{customer.full_name}</p>
                    <p className="text-xs text-muted">{formatPhoneDisplay(customer.phone)}</p>
                    {customer.address && (
                      <p className="mt-1 text-xs text-muted line-clamp-2">{customer.address}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={isEntreprise ? "default" : "accent"}>
                      {isEntreprise ? "Entreprise" : "Client normal"}
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
                          onClick={() => handleActivate(customer.id)}
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
                          onClick={() => handleDeactivate(customer.id, label)}
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
                        onClick={() => handleDelete(customer.id, label)}
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {customers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-muted">
                  Aucun compte Client Pro pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
