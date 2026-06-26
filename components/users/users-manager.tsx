"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SelectMenu } from "@/components/ui/select-menu";
import { CashierNfcField } from "@/components/users/cashier-nfc-field";
import { CreateUserWizard } from "@/components/users/create-user-wizard";
import { EditUserWizard } from "@/components/users/edit-user-wizard";
import { storeOptions } from "@/lib/select-options";
import {
  deleteUser,
  toggleUserActive,
  updateUserStore,
} from "@/lib/actions";
import { NATUS_CITIES } from "@/lib/constants/cities";
import { hasCustomPageAccess, summarizePageAccess } from "@/lib/user-page-access";
import { getRoleLabel, isDirector } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { Profile, Store, UserRole } from "@/lib/types";

function roleBadgeVariant(role: UserRole) {
  if (role === "directeur" || role === "admin") return "accent";
  if (role === "manager") return "default";
  if (role === "livreur") return "warning";
  return "success";
}

export function UsersManager({
  users,
  stores,
  viewer,
  nfcByCashier = {},
}: {
  users: Profile[];
  stores: Store[];
  viewer: Profile;
  nfcByCashier?: Record<string, string>;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const cities = isDirector(viewer)
    ? [...NATUS_CITIES]
    : viewer.city
      ? [viewer.city]
      : [];

  const storeMap = useMemo(
    () => Object.fromEntries(stores.map((s) => [s.id, s])),
    [stores]
  );

  const {
    paginated: paginatedUsers,
    page,
    setPage,
    totalPages,
    rangeStart,
    rangeEnd,
    totalItems,
  } = usePagination(users, DEFAULT_PAGE_SIZE);

  async function handleStoreChange(userId: string, storeId: string) {
    setLoading(userId);
    await updateUserStore(userId, storeId || null);
    router.refresh();
    setLoading(null);
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    setLoading(userId);
    await toggleUserActive(userId, isActive);
    router.refresh();
    setLoading(null);
  }

  async function handleDelete(userId: string, label: string) {
    if (
      !window.confirm(
        `Supprimer définitivement ${label} ?\n\nSi l'utilisateur a de l'historique, la suppression échouera — désactivez-le à la place.`
      )
    ) {
      return;
    }
    setLoading(userId);
    const result = await deleteUser(userId);
    if (result.error) {
      window.alert(result.error);
    } else {
      router.refresh();
    }
    setLoading(null);
  }

  return (
    <>
      <Card padding={false}>
        <div className="p-6">
          <CardHeader
            title="Utilisateurs"
            description={
              isDirector(viewer)
                ? `${users.length} utilisateur(s) — toutes villes`
                : `${users.length} utilisateur(s) — ${viewer.city}`
            }
            action={
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            }
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border bg-primary-light/50">
                <th className="px-6 py-3 text-left font-medium text-muted">Utilisateur</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Rôle</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Accès</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Ville</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Magasin</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Statut</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Créé le</th>
                <th className="px-6 py-3 text-right font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="border-b border-border">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium">
                        {user.full_name || user.email}
                        {user.id === viewer.id && (
                          <span className="ml-2 text-xs text-muted">(vous)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted">{user.email}</p>
                      {user.role === "cashier" && !user.is_store_pos && (
                        <CashierNfcField
                          cashierId={user.id}
                          initialUid={nfcByCashier[user.id]}
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={roleBadgeVariant(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                    {user.is_store_pos && (
                      <p className="mt-1 text-xs text-accent">Caisse magasin</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-muted">{summarizePageAccess(user)}</p>
                    {hasCustomPageAccess(user) && (
                      <Badge className="mt-1" variant="warning">
                        Personnalisé
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted">
                    {user.role === "directeur" || user.role === "admin"
                      ? "Toutes"
                      : user.city || storeMap[user.store_id || ""]?.city || "—"}
                  </td>
                  <td className="px-6 py-4">
                    {user.role === "cashier" || user.role === "livreur" ? (
                      <SelectMenu
                        value={user.store_id || ""}
                        onChange={(storeId) => handleStoreChange(user.id, storeId)}
                        options={storeOptions(
                          stores.filter(
                            (s) => isDirector(viewer) || s.city === viewer.city
                          ),
                          { allLabel: "—", includeAll: true, showCity: false }
                        )}
                        disabled={loading === user.id || user.id === viewer.id}
                        size="sm"
                        className="min-w-[140px]"
                      />
                    ) : user.role === "manager" ? (
                      <span className="text-xs text-muted">
                        {user.store_id
                          ? storeMap[user.store_id]?.name || "Magasin"
                          : `Tous les magasins — ${user.city}`}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={user.is_active ? "success" : "danger"}>
                      {user.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-muted">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    {user.id !== viewer.id &&
                      user.role !== "directeur" &&
                      user.role !== "admin" && (
                      <div className="flex justify-end gap-2">
                        {isDirector(viewer) &&
                          (user.role === "manager" ||
                            user.role === "cashier" ||
                            user.role === "livreur" ||
                            user.role === "hub") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingUser(user)}
                            title="Modifier l'utilisateur"
                          >
                            <Pencil className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                        {isDirector(viewer) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDelete(
                                user.id,
                                user.full_name || user.email
                              )
                            }
                            loading={loading === user.id}
                            title="Supprimer définitivement"
                          >
                            <Trash2 className="h-4 w-4 text-danger" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleToggleActive(user.id, !user.is_active)
                          }
                          loading={loading === user.id}
                        >
                          {user.is_active ? (
                            <UserX className="h-4 w-4 text-danger" />
                          ) : (
                            <UserCheck className="h-4 w-4 text-success" />
                          )}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length > 0 && (
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

      {showForm && (
        <CreateUserWizard
          viewer={viewer}
          stores={stores}
          cities={cities}
          onClose={() => setShowForm(false)}
        />
      )}

      {editingUser && isDirector(viewer) && (
        <EditUserWizard
          viewer={viewer}
          user={editingUser}
          stores={stores}
          cities={cities}
          onClose={() => setEditingUser(null)}
        />
      )}
    </>
  );
}
