"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, ScrollText, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SelectMenu } from "@/components/ui/select-menu";
import { ChequeEditModal } from "@/components/sales/cheque-edit-modal";
import {
  deleteSaleCheque,
  updateSaleChequeStatus,
} from "@/lib/sales/cheques/actions";
import {
  CHEQUE_STATUS_OPTIONS,
  getChequeStatusLabel,
  getChequeStatusVariant,
} from "@/lib/sales/cheques/constants";
import {
  canDeleteCheque,
  canEditChequeDetails,
  canUpdateChequeStatus,
  minutesUntilChequeEditExpires,
} from "@/lib/sales/cheques/permissions";
import type { SaleChequeRow, SaleChequeStatus } from "@/lib/sales/cheques/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Profile, UserRole } from "@/lib/types";

type ViewerProfile = Pick<Profile, "id" | "role">;

export function ChequesListPanel({
  cheques,
  viewer,
}: {
  cheques: SaleChequeRow[];
  viewer: ViewerProfile;
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<SaleChequeStatus | "all">("all");
  const [editingCheque, setEditingCheque] = useState<SaleChequeRow | null>(null);
  const [actionError, setActionError] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const showStatusControls = canUpdateChequeStatus(viewer);

  const filteredCheques = useMemo(() => {
    if (statusFilter === "all") return cheques;
    return cheques.filter((cheque) => cheque.status === statusFilter);
  }, [cheques, statusFilter]);

  function refreshList() {
    router.refresh();
  }

  function handleStatusChange(chequeId: string, status: SaleChequeStatus) {
    setActionError("");
    setLoadingId(chequeId);
    startTransition(async () => {
      const result = await updateSaleChequeStatus(chequeId, status);
      setLoadingId(null);
      if ("error" in result) {
        setActionError(result.error);
        return;
      }
      refreshList();
    });
  }

  function handleDelete(cheque: SaleChequeRow) {
    if (
      !confirm(
        "Annuler la vente liée à ce chèque et remettre les produits en stock ?"
      )
    ) {
      return;
    }

    setActionError("");
    setLoadingId(cheque.id);
    startTransition(async () => {
      const result = await deleteSaleCheque(cheque.id);
      setLoadingId(null);
      if ("error" in result) {
        setActionError(result.error);
        return;
      }
      refreshList();
    });
  }

  if (cheques.length === 0) {
    return (
      <Card className="py-12 text-center text-muted">
        <ScrollText className="mx-auto mb-3 h-8 w-8 text-primary/60" />
        Aucun chèque enregistré
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {showStatusControls ? (
          <div className="flex flex-wrap items-end gap-3">
            <SelectMenu
              label="Filtrer par statut"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as SaleChequeStatus | "all")}
              options={[
                { value: "all", label: "Tous les statuts" },
                ...CHEQUE_STATUS_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                })),
              ]}
              className="min-w-[200px]"
            />
            <p className="text-xs text-muted pb-2">
              Gérant et directeur : suivi dépôt banque et encaissement
            </p>
          </div>
        ) : null}

        {viewer.role === "cashier" ? (
          <p className="text-xs text-muted">
            Vous pouvez modifier ou supprimer un chèque pendant 30 minutes après
            l&apos;enregistrement. Ensuite, contactez le directeur.
          </p>
        ) : null}

        {actionError ? (
          <p className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{actionError}</p>
        ) : null}

        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-3 font-medium sm:px-6">Date</th>
                  <th className="px-4 py-3 font-medium sm:px-6">Magasin</th>
                  <th className="px-4 py-3 font-medium sm:px-6">Banque</th>
                  <th className="px-4 py-3 font-medium sm:px-6">N° chèque</th>
                  <th className="px-4 py-3 font-medium sm:px-6">Tireur</th>
                  <th className="px-4 py-3 font-medium sm:px-6">Montant</th>
                  <th className="px-4 py-3 font-medium sm:px-6">Statut</th>
                  <th className="px-4 py-3 font-medium sm:px-6">Caissier</th>
                  <th className="px-4 py-3 font-medium sm:px-6">Vente</th>
                  <th className="px-4 py-3 font-medium sm:px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCheques.map((cheque) => {
                  const editable = canEditChequeDetails(cheque, viewer);
                  const deletable = canDeleteCheque(cheque, viewer);
                  const minutesLeft = minutesUntilChequeEditExpires(cheque.created_at);
                  const isCancelled = Boolean(cheque.sale?.cancelled_at);

                  return (
                    <tr
                      key={cheque.id}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="px-4 py-3 whitespace-nowrap sm:px-6">
                        {formatDate(cheque.created_at)}
                      </td>
                      <td className="px-4 py-3 sm:px-6">
                        {cheque.store?.name || "—"}
                        {cheque.store?.city ? (
                          <span className="block text-xs text-muted">{cheque.store.city}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 sm:px-6">{cheque.bank_name}</td>
                      <td className="px-4 py-3 font-mono tabular-nums sm:px-6">
                        {cheque.cheque_number}
                      </td>
                      <td className="px-4 py-3 sm:px-6">{cheque.drawer_name || "—"}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums sm:px-6">
                        {formatCurrency(cheque.cheque_amount)}
                      </td>
                      <td className="px-4 py-3 sm:px-6">
                        {showStatusControls && !isCancelled ? (
                          <SelectMenu
                            value={cheque.status}
                            onChange={(status) =>
                              handleStatusChange(cheque.id, status as SaleChequeStatus)
                            }
                            options={CHEQUE_STATUS_OPTIONS.map((option) => ({
                              value: option.value,
                              label: option.label,
                            }))}
                            disabled={pending && loadingId === cheque.id}
                            size="xs"
                            showIcons={false}
                            className="min-w-[140px]"
                          />
                        ) : (
                          <Badge variant={getChequeStatusVariant(cheque.status)}>
                            {getChequeStatusLabel(cheque.status)}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 sm:px-6">
                        {cheque.cashier?.full_name || cheque.cashier?.email || "—"}
                      </td>
                      <td className="px-4 py-3 sm:px-6">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">
                            {formatCurrency(cheque.sale?.total ?? 0)}
                          </span>
                          {cheque.sale?.customer_name ? (
                            <span className="text-xs text-muted">
                              {cheque.sale.customer_name}
                            </span>
                          ) : null}
                          {isCancelled ? (
                            <Badge variant="danger">Vente annulée</Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 sm:px-6">
                        {!isCancelled && (editable || deletable) ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap gap-1">
                              {editable ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingCheque(cheque)}
                                  title="Modifier le chèque"
                                >
                                  <Pencil className="h-4 w-4 text-primary" />
                                </Button>
                              ) : null}
                              {deletable ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(cheque)}
                                  loading={pending && loadingId === cheque.id}
                                  title="Supprimer (annule la vente)"
                                >
                                  <Trash2 className="h-4 w-4 text-danger" />
                                </Button>
                              ) : null}
                            </div>
                            {viewer.role === "cashier" && editable && minutesLeft > 0 ? (
                              <span className="text-[10px] text-muted">
                                Modifiable encore {minutesLeft} min
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {editingCheque ? (
        <ChequeEditModal
          cheque={editingCheque}
          onClose={() => setEditingCheque(null)}
          onSaved={refreshList}
        />
      ) : null}
    </>
  );
}
