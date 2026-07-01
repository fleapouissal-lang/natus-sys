"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, UserCheck, UserX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Card, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { SelectMenu } from "@/components/ui/select-menu";
import { HubStorePicker } from "@/components/hub/hub-store-picker";
import { cityOptions } from "@/lib/select-options";
import { NATUS_CITIES } from "@/lib/constants/cities";
import { createUser, deleteUser, toggleUserActive, updateHubDepot } from "@/lib/actions";
import { formatDate } from "@/lib/utils";
import type { Profile, Store } from "@/lib/types";

function storesForCity(stores: Store[], city: string) {
  return stores.filter((store) => store.city === city && !store.is_hub);
}

function CreateHubForm({
  retailStores,
  onClose,
}: {
  retailStores: Store[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [city, setCity] = useState<string>(NATUS_CITIES[0] || "");
  const [password, setPassword] = useState("");
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selectedStoreIds.length === 0) {
      setError("Sélectionnez au moins un magasin rattaché au dépôt");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("role", "hub");
    formData.set("city", city);
    formData.set("password", password);
    selectedStoreIds.forEach((storeId) => formData.append("hub_store_ids", storeId));

    const result = await createUser(formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setPassword("");
    router.refresh();
    onClose();
  }

  return (
    <Modal onClose={onClose} size="md" closeOnBackdrop={false} closeOnEscape={false}>
      <CardHeader
        title="Nouveau compte dépôt"
        description="Magasins de la ville du dépôt par défaut — possibilité d'en ajouter d'autres villes"
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
        <Input label="Nom du dépôt" name="full_name" required placeholder="Dépôt Marrakech" />
        <Input
          label="Email"
          name="email"
          type="email"
          required
          placeholder="depot.marrakech@natus.ma"
        />
        <PasswordInput
          label="Mot de passe"
          name="password"
          maskWithAsterisk
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
          autoComplete="new-password"
        />
        <SelectMenu
          label="Ville"
          value={city}
          onChange={setCity}
          options={cityOptions(NATUS_CITIES, { includeAll: false })}
          required
        />
        <HubStorePicker
          hubCity={city}
          retailStores={retailStores}
          value={selectedStoreIds}
          onChange={setSelectedStoreIds}
          autoSelectCityStores
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          Créer le compte dépôt
        </Button>
      </form>
    </Modal>
  );
}

function EditHubDepotModal({
  hub,
  retailStores,
  assignedIds,
  onClose,
}: {
  hub: Profile;
  retailStores: Store[];
  assignedIds: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(hub.full_name ?? "");
  const [email, setEmail] = useState(hub.email);
  const [password, setPassword] = useState("");
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>(assignedIds);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selectedStoreIds.length === 0) {
      setError("Sélectionnez au moins un magasin rattaché au dépôt");
      return;
    }

    setError("");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("user_id", hub.id);
      formData.set("full_name", fullName.trim());
      formData.set("email", email.trim());
      if (password) formData.set("password", password);
      if (hub.city) formData.set("city", hub.city);
      selectedStoreIds.forEach((storeId) => formData.append("hub_store_ids", storeId));

      const result = await updateHubDepot(formData);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      router.refresh();
      onClose();
    });
  }

  return (
    <Modal onClose={onClose} size="md" closeOnBackdrop={false} closeOnEscape={false}>
      <CardHeader
        title="Modifier le dépôt"
        description={`Ville : ${hub.city}`}
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
        <Input
          label="Nom du dépôt"
          name="full_name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <Input
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <PasswordInput
          label="Nouveau mot de passe"
          name="password"
          maskWithAsterisk
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          placeholder="Laisser vide pour ne pas changer"
          autoComplete="new-password"
        />
        {hub.city && (
          <HubStorePicker
            hubCity={hub.city}
            retailStores={retailStores}
            value={selectedStoreIds}
            onChange={setSelectedStoreIds}
          />
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" loading={pending} className="w-full">
          Enregistrer
        </Button>
      </form>
    </Modal>
  );
}

export function HubAccountsManager({
  hubAccounts,
  retailStores,
  assignmentsByHub,
  showCreate: controlledShowCreate,
  onShowCreateChange,
  hideHeaderButton = false,
}: {
  hubAccounts: Profile[];
  retailStores: Store[];
  assignmentsByHub: Record<string, string[]>;
  showCreate?: boolean;
  onShowCreateChange?: (open: boolean) => void;
  hideHeaderButton?: boolean;
}) {
  const router = useRouter();
  const [internalShowCreate, setInternalShowCreate] = useState(false);
  const showCreate = controlledShowCreate ?? internalShowCreate;
  const setShowCreate = (open: boolean) => {
    if (onShowCreateChange) onShowCreateChange(open);
    else setInternalShowCreate(open);
  };
  const [editHub, setEditHub] = useState<Profile | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const storeMap = useMemo(
    () => Object.fromEntries(retailStores.map((store) => [store.id, store])),
    [retailStores]
  );

  async function toggleActive(userId: string, isActive: boolean) {
    await toggleUserActive(userId, !isActive);
    router.refresh();
  }

  async function handleDelete(hub: Profile) {
    if (
      !window.confirm(
        `Supprimer définitivement le dépôt « ${hub.full_name} » ?\n\nSi le dépôt a de l'historique (transferts…), la suppression échouera — désactivez-le à la place.`
      )
    ) {
      return;
    }

    setDeletingId(hub.id);
    const result = await deleteUser(hub.id);
    if (result.error) {
      window.alert(result.error);
    } else {
      router.refresh();
    }
    setDeletingId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comptes dépôt</h1>
          <p className="mt-1 text-muted">
            Par défaut, les magasins de la ville du dépôt — possibilité d&apos;en rattacher
            d&apos;autres villes
          </p>
        </div>
        {!hideHeaderButton && (
          <Button type="button" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Nouveau compte dépôt
          </Button>
        )}
      </div>

      <Card padding={false} className="natus-card">
        {hubAccounts.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted">Aucun compte dépôt</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-primary-light/30">
                  <th className="px-6 py-3 text-left font-medium text-muted">Nom</th>
                  <th className="px-6 py-3 text-left font-medium text-muted">Ville</th>
                  <th className="px-6 py-3 text-left font-medium text-muted">Magasins</th>
                  <th className="px-6 py-3 text-left font-medium text-muted">Email</th>
                  <th className="px-6 py-3 text-left font-medium text-muted">Statut</th>
                  <th className="px-6 py-3 text-right font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {hubAccounts.map((hub) => {
                  const assignedIds = assignmentsByHub[hub.id] || [];
                  const cityStoreCount = hub.city
                    ? storesForCity(retailStores, hub.city).length
                    : 0;
                  const assignedNames = assignedIds
                    .map((id) => storeMap[id]?.name)
                    .filter(Boolean)
                    .slice(0, 3);
                  const crossCityCount = assignedIds.filter(
                    (id) => storeMap[id] && hub.city && storeMap[id].city !== hub.city
                  ).length;

                  return (
                    <tr key={hub.id} className="border-b border-border last:border-b-0">
                      <td className="px-6 py-4 font-medium">{hub.full_name}</td>
                      <td className="px-6 py-4">{hub.city}</td>
                      <td className="px-6 py-4">
                        <p className="font-medium">
                          {assignedIds.length} magasin{assignedIds.length !== 1 ? "s" : ""}
                          {cityStoreCount > 0 ? ` · ${cityStoreCount} en ville` : ""}
                        </p>
                        {crossCityCount > 0 && (
                          <p className="mt-0.5 text-xs text-muted">
                            {crossCityCount} hors ville
                          </p>
                        )}
                        {assignedNames.length > 0 && (
                          <p className="mt-1 text-xs text-muted">
                            {assignedNames.join(" · ")}
                            {assignedIds.length > 3 ? ` · +${assignedIds.length - 3}` : ""}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted">{hub.email}</td>
                      <td className="px-6 py-4">
                        <Badge variant={hub.is_active ? "success" : "default"}>
                          {hub.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="!bg-transparent !p-2 text-primary hover:text-primary-dark"
                            onClick={() => setEditHub(hub)}
                            title="Modifier le dépôt"
                            aria-label="Modifier le dépôt"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="!bg-transparent !p-2 text-primary hover:text-primary-dark"
                            onClick={() => void toggleActive(hub.id, hub.is_active)}
                            title={hub.is_active ? "Désactiver le dépôt" : "Activer le dépôt"}
                            aria-label={hub.is_active ? "Désactiver le dépôt" : "Activer le dépôt"}
                          >
                            {hub.is_active ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="!bg-transparent !p-2 text-danger hover:text-danger"
                            loading={deletingId === hub.id}
                            onClick={() => void handleDelete(hub)}
                            title="Supprimer le dépôt"
                            aria-label="Supprimer le dépôt"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="mt-1 text-right text-xs text-muted">
                          {formatDate(hub.created_at)}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showCreate && (
        <CreateHubForm retailStores={retailStores} onClose={() => setShowCreate(false)} />
      )}

      {editHub && (
        <EditHubDepotModal
          hub={editHub}
          retailStores={retailStores}
          assignedIds={assignmentsByHub[editHub.id] || []}
          onClose={() => setEditHub(null)}
        />
      )}
    </div>
  );
}
