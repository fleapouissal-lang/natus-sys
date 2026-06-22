"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Card, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { StoreSelect } from "@/components/stores/store-select";
import { SelectMenu } from "@/components/ui/select-menu";
import { CashierNfcField } from "@/components/users/cashier-nfc-field";
import { cityOptions, roleOptions, storeOptions } from "@/lib/select-options";
import {
  createUser,
  toggleUserActive,
  updateUserStore,
} from "@/lib/actions";
import { NATUS_CITIES } from "@/lib/constants/cities";
import { getRoleLabel, isDirector, isManager } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { Profile, Store, UserRole } from "@/lib/types";

function CreateUserForm({
  viewer,
  stores,
  cities,
  onClose,
}: {
  viewer: Profile;
  stores: Store[];
  cities: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState<"manager" | "cashier" | "livreur">("cashier");
  const [isStorePos, setIsStorePos] = useState(false);
  const [city, setCity] = useState(
    isDirector(viewer) ? cities[0] || "" : viewer.city || ""
  );

  const storesForCity = useMemo(
    () => stores.filter((s) => s.city === city),
    [stores, city]
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("role", role);
    if (role === "cashier" && isStorePos) {
      formData.set("is_store_pos", "on");
    }
    if (role === "manager" || isDirector(viewer)) {
      formData.set("city", city);
    }

    const result = await createUser(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
    onClose();
  }

  const roleOptionsList: { value: "manager" | "cashier" | "livreur"; label: string }[] =
    isDirector(viewer)
      ? [
          { value: "cashier", label: "Caissier" },
          { value: "livreur", label: "Livreur (magasin)" },
          { value: "manager", label: "Gérant (ville)" },
        ]
      : [
          { value: "cashier", label: "Caissier" },
          { value: "livreur", label: "Livreur (magasin)" },
        ];

  return (
    <Modal onClose={onClose} size="md">
        <CardHeader title="Nouvel utilisateur" />
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nom complet" name="full_name" required />
          <Input label="Email" name="email" type="email" required />
          <PasswordInput
            label="Mot de passe"
            name="password"
            minLength={6}
            required
          />
          <SelectMenu
            label="Rôle"
            value={role}
            onChange={(v) => setRole(v as "manager" | "cashier" | "livreur")}
            options={roleOptions(roleOptionsList)}
          />

          {(role === "manager" || role === "cashier" || role === "livreur") && (
            <>
              <SelectMenu
                name="city"
                label="Ville"
                value={city}
                onChange={setCity}
                options={cityOptions(cities, { includeAll: false })}
                required
                disabled={isManager(viewer)}
              />
              {role === "manager" && (
                <p className="-mt-2 text-xs text-muted">
                  Le gérant gérera tous les magasins de cette ville
                </p>
              )}
            </>
          )}

          {(role === "cashier" || role === "livreur") && storesForCity.length > 0 && (
            <StoreSelect
              stores={storesForCity}
              label={role === "livreur" ? "Magasin du livreur" : "Magasin assigné"}
            />
          )}

          {role === "cashier" && (
            <label className="flex items-start gap-2 rounded-lg border border-border bg-surface-2 p-3 text-sm">
              <input
                type="checkbox"
                checked={isStorePos}
                onChange={(e) => setIsStorePos(e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="font-medium">Compte caisse partagé du magasin</span>
                <span className="mt-1 block text-xs text-muted">
                  Un seul par magasin. Les caissiers se connectent ensuite avec leur email,
                  mot de passe ou carte NFC sur cette caisse.
                </span>
              </span>
            </label>
          )}

          {(role === "cashier" || role === "livreur") && storesForCity.length === 0 && (
            <p className="text-sm text-danger">
              Aucun magasin dans cette ville — créez-en un d&apos;abord
            </p>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={(role === "cashier" || role === "livreur") && storesForCity.length === 0}
            >
              Créer
            </Button>
          </div>
        </form>
    </Modal>
  );
}

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
                        Tous les magasins — {user.city}
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
        <CreateUserForm
          viewer={viewer}
          stores={stores}
          cities={cities}
          onClose={() => setShowForm(false)}
        />
      )}
    </>
  );
}
