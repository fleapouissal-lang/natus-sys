"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserCheck, UserX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Card, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { SelectMenu } from "@/components/ui/select-menu";
import { cityOptions } from "@/lib/select-options";
import { createUser, toggleUserActive, updateHubManagers } from "@/lib/actions";
import { formatDate } from "@/lib/utils";
import type { Profile } from "@/lib/types";

function CreateHubForm({
  cities,
  onClose,
}: {
  cities: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [city, setCity] = useState(cities[0] || "");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("role", "hub");
    formData.set("city", city);
    formData.set("password", password);

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
        title="Nouveau compte hub stock"
        description="Les gérants actifs de la ville seront affectés automatiquement"
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
        <Input label="Nom du hub" name="full_name" required placeholder="Hub Marrakech" />
        <Input
          label="Email"
          name="email"
          type="email"
          required
          placeholder="hub.marrakech@natus.ma"
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
          options={cityOptions(cities, { includeAll: false })}
          required
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          Créer le compte hub
        </Button>
      </form>
    </Modal>
  );
}

function HubManagersModal({
  hub,
  cityManagers,
  assignedIds,
  onClose,
}: {
  hub: Profile;
  cityManagers: Profile[];
  assignedIds: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(assignedIds);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function toggleManager(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function save() {
    setError("");
    startTransition(async () => {
      const result = await updateHubManagers(hub.id, selected);
      if ("error" in result) {
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
        title={`Gérants — ${hub.full_name}`}
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
      <div className="space-y-2">
        {cityManagers.length === 0 ? (
          <p className="text-sm text-muted">Aucun gérant actif dans cette ville.</p>
        ) : (
          cityManagers.map((manager) => (
            <label
              key={manager.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 hover:bg-primary-light/10"
            >
              <input
                type="checkbox"
                checked={selected.includes(manager.id)}
                onChange={() => toggleManager(manager.id)}
                className="h-4 w-4 accent-primary"
              />
              <div>
                <p className="text-sm font-medium">{manager.full_name}</p>
                <p className="text-xs text-muted">{manager.email}</p>
              </div>
            </label>
          ))
        )}
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <Button type="button" className="mt-4 w-full" loading={pending} onClick={save}>
        Enregistrer les affectations
      </Button>
    </Modal>
  );
}

export function HubAccountsManager({
  hubAccounts,
  managersByCity,
  assignmentsByHub,
}: {
  hubAccounts: Profile[];
  managersByCity: Record<string, Profile[]>;
  assignmentsByHub: Record<string, string[]>;
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [editHub, setEditHub] = useState<Profile | null>(null);
  const cities = useMemo(() => Object.keys(managersByCity).sort(), [managersByCity]);

  async function toggleActive(userId: string, isActive: boolean) {
    await toggleUserActive(userId, !isActive);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comptes hub stock</h1>
          <p className="mt-1 text-muted">
            Créez des comptes hub par ville et affectez les gérants
          </p>
        </div>
        <Button type="button" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          Nouveau compte hub
        </Button>
      </div>

      <Card padding={false}>
        {hubAccounts.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted">Aucun compte hub</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-primary-light/30">
                  <th className="px-6 py-3 text-left font-medium text-muted">Nom</th>
                  <th className="px-6 py-3 text-left font-medium text-muted">Ville</th>
                  <th className="px-6 py-3 text-left font-medium text-muted">Email</th>
                  <th className="px-6 py-3 text-left font-medium text-muted">Gérants</th>
                  <th className="px-6 py-3 text-left font-medium text-muted">Statut</th>
                  <th className="px-6 py-3 text-right font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {hubAccounts.map((hub) => {
                  const assignedCount = assignmentsByHub[hub.id]?.length ?? 0;
                  const cityManagers = hub.city ? managersByCity[hub.city] || [] : [];
                  return (
                    <tr key={hub.id} className="border-b border-border last:border-b-0">
                      <td className="px-6 py-4 font-medium">{hub.full_name}</td>
                      <td className="px-6 py-4">{hub.city}</td>
                      <td className="px-6 py-4 text-muted">{hub.email}</td>
                      <td className="px-6 py-4">
                        {assignedCount} / {cityManagers.length}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={hub.is_active ? "success" : "default"}>
                          {hub.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditHub(hub)}
                          >
                            Gérants
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => void toggleActive(hub.id, hub.is_active)}
                          >
                            {hub.is_active ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
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

      {showCreate && <CreateHubForm cities={cities} onClose={() => setShowCreate(false)} />}

      {editHub && editHub.city && (
        <HubManagersModal
          hub={editHub}
          cityManagers={managersByCity[editHub.city] || []}
          assignedIds={assignmentsByHub[editHub.id] || []}
          onClose={() => setEditHub(null)}
        />
      )}
    </div>
  );
}
