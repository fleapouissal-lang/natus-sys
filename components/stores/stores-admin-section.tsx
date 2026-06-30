"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Pencil,
  Plus,
  Store,
  Trash2,
  UserX,
  Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select-menu";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cityOptions } from "@/lib/select-options";
import {
  createStore,
  deactivateStorePosAccount,
  deleteStore,
  updateStore,
} from "@/lib/actions";
import { cn } from "@/lib/utils";
import type { StoreWithStats } from "@/lib/types";

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

export function StoresAdminSection({
  stores,
  allowedCities,
  defaultCity,
}: {
  stores: StoreWithStats[];
  allowedCities: string[];
  defaultCity?: string;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [createCity, setCreateCity] = useState(defaultCity || allowedCities[0] || "");
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [pendingStoreId, setPendingStoreId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"delete" | "deactivate" | null>(null);
  const [actionPending, startActionTransition] = useTransition();

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError("");
    setCreateSuccess("");

    const result = await createStore(new FormData(e.currentTarget));
    setCreateLoading(false);

    if ("error" in result) {
      setCreateError(result.error ?? "Création impossible");
      return;
    }

    setCreateSuccess("Magasin créé avec succès");
    (e.target as HTMLFormElement).reset();
    setCreateCity(defaultCity || allowedCities[0] || "");
    setCreateOpen(false);
    router.refresh();
  }

  function handleDelete(store: StoreWithStats) {
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
    <Card padding={false} className="overflow-hidden">
      <div className="border-b border-border p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <CardHeader
            title="Nouveau magasin"
            description="Créer un point de vente et gérer les magasins existants"
          />
          <Button
            type="button"
            variant={createOpen ? "secondary" : "primary"}
            onClick={() => setCreateOpen((open) => !open)}
            className="w-full sm:w-auto"
          >
            <Plus className="natus-icon h-4 w-4" strokeWidth={2} aria-hidden />
            {createOpen ? "Masquer" : "Ajouter un magasin"}
            <ChevronDown
              className={cn("natus-icon h-4 w-4 transition-transform", createOpen && "rotate-180")}
              strokeWidth={2}
              aria-hidden
            />
          </Button>
        </div>

        {createOpen && (
          <form onSubmit={handleCreate} className="mt-4 space-y-4 border-t border-border pt-4">
            <Input label="Nom du magasin" name="name" required placeholder="Natus ..." />
            <SelectMenu
              name="city"
              label="Ville"
              required
              value={createCity}
              onChange={setCreateCity}
              options={cityOptions(allowedCities, { includeAll: false })}
            />
            {allowedCities.length === 1 && (
              <p className="-mt-2 text-xs text-muted">
                Magasin limité à votre ville : {allowedCities[0]}
              </p>
            )}
            <Input label="Adresse" name="address" placeholder="Rue, quartier..." />
            {createError && <p className="text-sm text-danger">{createError}</p>}
            {createSuccess && <p className="text-sm text-success">{createSuccess}</p>}
            <div className="flex flex-wrap justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" loading={createLoading}>
                <Plus className="natus-icon h-4 w-4" strokeWidth={2} aria-hidden />
                Créer le magasin
              </Button>
            </div>
          </form>
        )}
      </div>

      {actionError && (
        <p className="border-b border-danger/20 bg-danger/5 px-6 py-3 text-sm text-danger">
          {actionError}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-primary-light/40">
              <th className="px-4 py-3 text-left font-medium text-muted sm:px-6">Point de vente</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Ville</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Compte caisse</th>
              <th className="px-4 py-3 text-right font-medium text-muted sm:px-6">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((store) => {
              const isEditing = editingStoreId === store.id;
              const isBusy = actionPending && pendingStoreId === store.id;
              const posAccount = store.posAccount;

              return (
                <Fragment key={store.id}>
                  <tr className="border-b border-border align-top">
                    <td className="px-4 py-4 sm:px-6">
                      <div className="flex items-start gap-2">
                        {store.is_hub ? (
                          <Warehouse className="natus-icon mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} aria-hidden />
                        ) : (
                          <Store className="natus-icon mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} aria-hidden />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium">{store.name}</p>
                          <p className="text-xs text-muted">{store.address || "—"}</p>
                          {store.is_hub && (
                            <Badge variant="accent" className="mt-1">
                              Dépôt
                            </Badge>
                          )}
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
                      <div className="flex flex-col items-stretch gap-2 sm:items-end">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditingStoreId(isEditing ? null : store.id)}
                          className="w-full sm:w-auto"
                        >
                          <Pencil className="natus-icon h-4 w-4" strokeWidth={2} aria-hidden />
                          Modifier
                        </Button>
                        {!store.is_hub && (
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            loading={isBusy && pendingAction === "delete"}
                            disabled={isBusy}
                            onClick={() => handleDelete(store)}
                            className="w-full sm:w-auto"
                          >
                            <Trash2 className="natus-icon h-4 w-4" strokeWidth={2} aria-hidden />
                            Supprimer
                          </Button>
                        )}
                        {posAccount?.is_active && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            loading={isBusy && pendingAction === "deactivate"}
                            disabled={isBusy}
                            onClick={() => handleDeactivatePos(store)}
                            className="w-full border border-border sm:w-auto"
                          >
                            <UserX className="natus-icon h-4 w-4" strokeWidth={2} aria-hidden />
                            Désactiver compte
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
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
