"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Plus,
  Store,
  Trash2,
  UserX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectMenu, type SelectMenuOption } from "@/components/ui/select-menu";
import { Card, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { cityOptions } from "@/lib/select-options";
import {
  createStore,
  deactivateStorePosAccount,
  deleteStore,
  updateStore,
} from "@/lib/actions";
import type { StoreWithStats } from "@/lib/types";

type StatusFilter = "all" | "active" | "inactive" | "none";

const STATUS_OPTIONS: SelectMenuOption[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "active", label: "Caisse active" },
  { value: "inactive", label: "Caisse inactive" },
  { value: "none", label: "Sans compte caisse" },
];

function EditStoreForm({
  store,
  allowedCities,
  onCancel,
  onSaved,
}: {
  store: StoreWithStats;
  allowedCities: string[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [city, setCity] = useState(store.city);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await updateStore(store.id, new FormData(e.currentTarget));
    setLoading(false);

    if ("error" in result) {
      setError(result.error ?? "Modification impossible");
      return;
    }

    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <p className="text-sm font-semibold">Modifier « {store.name} »</p>
      <Input label="Nom" name="name" required defaultValue={store.name} />
      <SelectMenu
        name="city"
        label="Ville"
        required
        value={city}
        onChange={setCity}
        options={cityOptions(allowedCities, { includeAll: false })}
      />
      <Input label="Adresse" name="address" defaultValue={store.address || ""} />
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" size="sm" loading={loading}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

function CreateStoreModal({
  allowedCities,
  defaultCity,
  onClose,
}: {
  allowedCities: string[];
  defaultCity?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [city, setCity] = useState(defaultCity || allowedCities[0] || "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await createStore(new FormData(e.currentTarget));
    setLoading(false);

    if ("error" in result) {
      setError(result.error ?? "Création impossible");
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <Modal onClose={onClose} size="md" closeOnBackdrop={false} closeOnEscape={false}>
      <CardHeader
        title="Nouveau magasin"
        description="Créer un point de vente dans le réseau"
        action={
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 cursor-pointer text-muted hover:text-foreground"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        }
      />
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nom du magasin" name="name" required placeholder="Natus ..." />
        <SelectMenu
          name="city"
          label="Ville"
          required
          value={city}
          onChange={setCity}
          options={cityOptions(allowedCities, { includeAll: false })}
        />
        {allowedCities.length === 1 && (
          <p className="-mt-2 text-xs text-muted">
            Magasin limité à votre ville : {allowedCities[0]}
          </p>
        )}
        <Input label="Adresse" name="address" placeholder="Rue, quartier..." />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          Créer le magasin
        </Button>
      </form>
    </Modal>
  );
}

export function StoresAdminSection({
  stores,
  allowedCities,
  defaultCity,
  createOpen: controlledCreateOpen,
  onCreateOpenChange,
  hideTrigger = false,
  hideFilters = false,
}: {
  stores: StoreWithStats[];
  allowedCities: string[];
  defaultCity?: string;
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  hideFilters?: boolean;
}) {
  const router = useRouter();
  const [internalCreateOpen, setInternalCreateOpen] = useState(false);
  const createOpen = controlledCreateOpen ?? internalCreateOpen;
  const setCreateOpen = (open: boolean) => {
    if (onCreateOpenChange) onCreateOpenChange(open);
    else setInternalCreateOpen(open);
  };
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [pendingStoreId, setPendingStoreId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"delete" | "deactivate" | null>(null);
  const [actionPending, startActionTransition] = useTransition();

  const [cityFilter, setCityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Cette section ne liste que les magasins ; les dépôts sont gérés dans la
  // section « Comptes dépôt ».
  const shopsOnly = useMemo(() => stores.filter((store) => !store.is_hub), [stores]);

  const cityFilterOptions = useMemo(() => {
    const cities = [...new Set(shopsOnly.map((store) => store.city).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "fr")
    );
    return cityOptions(cities, { includeAll: true });
  }, [shopsOnly]);

  const filteredStores = useMemo(() => {
    return shopsOnly.filter((store) => {
      if (cityFilter && store.city !== cityFilter) return false;
      if (statusFilter === "active" && !store.posAccount?.is_active) return false;
      if (statusFilter === "inactive" && !(store.posAccount && !store.posAccount.is_active))
        return false;
      if (statusFilter === "none" && store.posAccount) return false;
      return true;
    });
  }, [shopsOnly, cityFilter, statusFilter]);

  const hasFilters = Boolean(cityFilter) || statusFilter !== "all";

  function resetFilters() {
    setCityFilter("");
    setStatusFilter("all");
  }

  function renderStoreRow(store: StoreWithStats) {
    const isEditing = editingStoreId === store.id;
    const isBusy = actionPending && pendingStoreId === store.id;
    const posAccount = store.posAccount;

    return (
      <Fragment key={store.id}>
        <tr className="border-b border-border/70 align-top transition-colors hover:bg-primary/[0.03]">
          <td className="px-4 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-surface text-primary">
                <Store className="natus-icon h-4 w-4" strokeWidth={2} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-medium">{store.name}</p>
                <p className="text-xs text-muted">{store.address || "—"}</p>
              </div>
            </div>
          </td>
          <td className="px-4 py-4">
            <Badge>{store.city}</Badge>
          </td>
          <td className="px-4 py-4">
            {posAccount ? (
              <div className="space-y-1">
                <p className="font-medium">{posAccount.full_name || posAccount.email}</p>
                <p className="text-xs text-muted">{posAccount.email}</p>
                <Badge variant={posAccount.is_active ? "success" : "danger"}>
                  {posAccount.is_active ? "Actif" : "Inactif"}
                </Badge>
              </div>
            ) : (
              <span className="text-muted">Aucun compte</span>
            )}
          </td>
          <td className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="!p-2"
                onClick={() => setEditingStoreId(isEditing ? null : store.id)}
                title={isEditing ? "Fermer" : "Modifier"}
                aria-label={isEditing ? "Fermer" : "Modifier"}
              >
                <Pencil className="natus-icon h-4 w-4" strokeWidth={2} aria-hidden />
              </Button>
              {posAccount?.is_active && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="!p-2"
                  loading={isBusy && pendingAction === "deactivate"}
                  disabled={isBusy}
                  onClick={() => handleDeactivatePos(store)}
                  title="Désactiver le compte caisse"
                  aria-label="Désactiver le compte caisse"
                >
                  <UserX className="natus-icon h-4 w-4" strokeWidth={2} aria-hidden />
                </Button>
              )}
              {!store.is_hub && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="!p-2 border-danger/30 text-danger hover:border-danger hover:bg-danger/5"
                  loading={isBusy && pendingAction === "delete"}
                  disabled={isBusy}
                  onClick={() => handleDelete(store)}
                  title="Supprimer le magasin"
                  aria-label="Supprimer le magasin"
                >
                  <Trash2 className="natus-icon h-4 w-4" strokeWidth={2} aria-hidden />
                </Button>
              )}
            </div>
          </td>
        </tr>
        {isEditing && (
          <tr className="border-b border-border bg-page/40">
            <td colSpan={4} className="px-4 py-4 sm:px-6">
              <EditStoreForm
                store={store}
                allowedCities={allowedCities}
                onCancel={() => setEditingStoreId(null)}
                onSaved={() => {
                  setEditingStoreId(null);
                  router.refresh();
                }}
              />
            </td>
          </tr>
        )}
      </Fragment>
    );
  }

  async function handleDelete(store: StoreWithStats) {
    if (store.is_hub) return;

    const message = `Supprimer le magasin « ${store.name} » (${store.city}) ?\n\nLe magasin sera désactivé et n'apparaîtra plus dans les listes. L'historique (ventes, transferts…) est conservé.`;
    if (!window.confirm(message)) return;

    setActionError("");
    setPendingStoreId(store.id);
    setPendingAction("delete");

    startActionTransition(async () => {
      const result = await deleteStore(store.id);
      setPendingStoreId(null);
      setPendingAction(null);

      if ("error" in result) {
        setActionError(result.error ?? "Suppression impossible");
        return;
      }

      setEditingStoreId((current) => (current === store.id ? null : current));
      router.refresh();
    });
  }

  function handleDeactivatePos(store: StoreWithStats) {
    const label = store.posAccount?.email || "compte caisse magasin";
    const message = `Désactiver le compte caisse magasin de « ${store.name} » (${label}) ?\n\nLa caisse ne pourra plus se connecter tant que le compte n'est pas réactivé depuis Utilisateurs.`;

    if (!window.confirm(message)) return;

    setActionError("");
    setPendingStoreId(store.id);
    setPendingAction("deactivate");

    startActionTransition(async () => {
      const result = await deactivateStorePosAccount(store.id);
      setPendingStoreId(null);
      setPendingAction(null);

      if ("error" in result) {
        setActionError(result.error ?? "Désactivation impossible");
        return;
      }

      router.refresh();
    });
  }

  return (
    <>
    <Card padding={false} className="natus-card overflow-hidden">
      {!hideTrigger && (
        <div className="border-b border-primary/15 bg-gradient-to-r from-primary/[0.06] to-transparent p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <CardHeader
              title="Magasins"
              description="Créer et gérer les magasins"
            />
            <Button
              type="button"
              variant="primary"
              onClick={() => setCreateOpen(true)}
              className="w-full sm:w-auto"
            >
              <Plus className="natus-icon h-4 w-4" strokeWidth={2} aria-hidden />
              Ajouter un magasin
            </Button>
          </div>
        </div>
      )}

      {!hideFilters && (
        <div className="border-b border-border bg-page/30 p-4 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectMenu
              label="Ville"
              size="sm"
              value={cityFilter}
              onChange={setCityFilter}
              options={cityFilterOptions}
            />
            <SelectMenu
              label="Statut caisse"
              size="sm"
              showIcons={false}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as StatusFilter)}
              options={STATUS_OPTIONS}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
            <span>
              <span className="font-semibold text-foreground">{filteredStores.length}</span> magasin
              {filteredStores.length !== 1 ? "s" : ""}
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="cursor-pointer font-medium text-primary hover:underline"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      )}

      {actionError && (
        <p className="border-b border-danger/20 bg-danger/5 px-6 py-3 text-sm text-danger">
          {actionError}
        </p>
      )}

      {filteredStores.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-muted">
          {hideFilters ? "Aucun magasin" : "Aucun magasin ne correspond aux filtres"}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-primary/20 bg-primary/[0.04] text-[11px] uppercase tracking-[0.1em] text-muted">
                <th className="px-4 py-3 text-left font-semibold sm:px-6">Magasin</th>
                <th className="px-4 py-3 text-left font-semibold">Ville</th>
                <th className="px-4 py-3 text-left font-semibold">Compte caisse</th>
                <th className="px-4 py-3 text-right font-semibold sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody>{filteredStores.map((store) => renderStoreRow(store))}</tbody>
          </table>
        </div>
      )}
    </Card>

    {createOpen && (
      <CreateStoreModal
        allowedCities={allowedCities}
        defaultCity={defaultCity}
        onClose={() => setCreateOpen(false)}
      />
    )}
    </>
  );
}
