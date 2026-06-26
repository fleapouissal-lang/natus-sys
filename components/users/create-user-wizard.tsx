"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { StoreSelect } from "@/components/stores/store-select";
import { SelectMenu } from "@/components/ui/select-menu";
import { cityOptions, roleOptions } from "@/lib/select-options";
import { createUser } from "@/lib/actions";
import {
  getDefaultPageKeysForRole,
  getGroupedPageDefinitionsForRole,
  type UserPageKey,
} from "@/lib/user-page-access";
import { isDirector, isManager } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { Profile, Store } from "@/lib/types";

type CreateRole = "manager" | "cashier" | "livreur";

function StepIndicator({ step }: { step: 1 | 2 }) {
  const steps = [
    { id: 1 as const, label: "Identité", icon: UserRound },
    { id: 2 as const, label: "Pages", icon: LayoutGrid },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3">
      {steps.map(({ id, label, icon: Icon }) => {
        const active = step === id;
        const done = step > id;
        return (
          <div
            key={id}
            className={cn(
              "rounded-2xl border px-4 py-3 transition-colors",
              active
                ? "border-primary/40 bg-champagne/40 shadow-[0_8px_24px_rgba(179,140,74,0.12)]"
                : done
                  ? "border-primary/20 bg-surface"
                  : "border-border bg-surface/60"
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl",
                  active ? "bg-primary text-white" : "bg-primary/10 text-primary"
                )}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </span>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
                  Étape {id}
                </p>
                <p className="font-heading text-sm font-semibold">{label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CreateUserWizard({
  viewer,
  stores,
  cities,
  onClose,
  cashierOnly = false,
  defaultStoreId,
}: {
  viewer: Profile;
  stores: Store[];
  cities: string[];
  onClose: () => void;
  cashierOnly?: boolean;
  defaultStoreId?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<CreateRole>("cashier");
  const [city, setCity] = useState(
    isDirector(viewer) ? cities[0] || "" : viewer.city || ""
  );
  const [storeId, setStoreId] = useState(defaultStoreId || "");
  const [limitManagerToStore, setLimitManagerToStore] = useState(false);
  const [useCustomPages, setUseCustomPages] = useState(false);
  const [selectedPages, setSelectedPages] = useState<UserPageKey[]>(() =>
    getDefaultPageKeysForRole("cashier")
  );

  const storesForCity = useMemo(
    () => stores.filter((s) => s.city === city),
    [stores, city]
  );

  const pageSections = useMemo(
    () => getGroupedPageDefinitionsForRole(role),
    [role]
  );

  const defaultPages = useMemo(() => getDefaultPageKeysForRole(role), [role]);
  const skipPageStep = cashierOnly || isManager(viewer);

  useEffect(() => {
    if (defaultStoreId) setStoreId(defaultStoreId);
  }, [defaultStoreId]);

  const needsStore =
    role === "cashier" || role === "livreur" || (role === "manager" && limitManagerToStore);

  function handleRoleChange(nextRole: CreateRole) {
    setRole(nextRole);
    setSelectedPages(getDefaultPageKeysForRole(nextRole));
    if (nextRole !== "manager") setLimitManagerToStore(false);
  }

  function togglePage(key: UserPageKey) {
    setSelectedPages((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  }

  function selectAllPages() {
    setSelectedPages(defaultPages);
  }

  function canContinueStep1() {
    if (!fullName.trim() || !email.trim() || password.length < 6) return false;
    if ((role === "manager" || role === "cashier" || role === "livreur") && !city) {
      return false;
    }
    if (needsStore && !storeId) return false;
    if (needsStore && storesForCity.length === 0) return false;
    return true;
  }

  async function handleCreate() {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.set("full_name", fullName.trim());
    formData.set("email", email.trim());
    formData.set("password", password);
    formData.set("role", role);
    formData.set("city", city);
    if (storeId) formData.set("store_id", storeId);
    if (role === "cashier") formData.set("is_store_pos", "on");
    if (role === "manager" && limitManagerToStore) {
      formData.set("limit_to_store", "on");
    }
    if (isDirector(viewer) && useCustomPages) {
      formData.set("use_custom_pages", "on");
      formData.set("allowed_pages", JSON.stringify(selectedPages));
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

  const roleOptionsList: { value: CreateRole; label: string }[] = cashierOnly
    ? [{ value: "cashier", label: "Caissier" }]
    : isDirector(viewer)
      ? [
          { value: "cashier", label: "Caissier" },
          { value: "livreur", label: "Livreur (magasin)" },
          { value: "manager", label: "Gérant" },
        ]
      : [{ value: "cashier", label: "Caissier" }];

  return (
    <Modal onClose={onClose} size="lg">
      <div className="border-b border-primary/10 bg-gradient-to-r from-champagne/30 via-surface to-surface px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {cashierOnly ? "Compte caisse" : "Création avancée"}
            </div>
            <CardHeader
              title={cashierOnly ? "Nouveau caissier" : "Nouvel utilisateur"}
              description={
                cashierOnly
                  ? "Créez le compte de connexion caisse pour le magasin sélectionné."
                  : "Étape par étape : identité du compte, puis pages visibles dans l'application."
              }
            />
          </div>
        </div>
      </div>

      <div className="px-6 py-5">
        {!skipPageStep && <StepIndicator step={step} />}

        {step === 1 ? (
          <div className="space-y-4">
            <Input
              label="Nom complet"
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
              label="Mot de passe"
              name="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {!cashierOnly && (
              <SelectMenu
                label="Rôle"
                value={role}
                onChange={(v) => handleRoleChange(v as CreateRole)}
                options={roleOptions(roleOptionsList)}
              />
            )}

            {(role === "manager" || role === "cashier" || role === "livreur") && (
              <SelectMenu
                label="Ville"
                value={city}
                onChange={(value) => {
                  setCity(value);
                  setStoreId("");
                }}
                options={cityOptions(cities, { includeAll: false })}
                required
                disabled={isManager(viewer)}
              />
            )}

            {role === "manager" && isDirector(viewer) && (
              <label className="flex items-start gap-3 rounded-2xl border border-border bg-surface-2 p-4 text-sm">
                <input
                  type="checkbox"
                  checked={limitManagerToStore}
                  onChange={(e) => {
                    setLimitManagerToStore(e.target.checked);
                    if (!e.target.checked) setStoreId("");
                  }}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">Limiter à un seul magasin</span>
                  <span className="mt-1 block text-xs text-muted">
                    Sinon, le gérant voit tous les magasins de la ville.
                  </span>
                </span>
              </label>
            )}

            {needsStore && storesForCity.length > 0 && (
              <StoreSelect
                stores={storesForCity}
                label="Magasin assigné"
                value={storeId}
                onChange={setStoreId}
              />
            )}

            {role === "cashier" && (
              <div className="rounded-2xl border border-primary/20 bg-champagne/20 p-4 text-sm">
                <p className="font-medium">Compte caisse partagé du magasin</p>
                <p className="mt-1 text-xs text-muted">
                  Un seul compte de connexion par magasin. Les noms des caissiers se gèrent
                  dans Planning, sans créer de comptes individuels.
                </p>
              </div>
            )}

            {needsStore && storesForCity.length === 0 && (
              <p className="text-sm text-danger">
                Aucun magasin dans cette ville — créez-en un d&apos;abord.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-primary/15 bg-champagne/20 p-4">
              <p className="font-heading text-base font-semibold">
                Pages visibles pour {getRolePreviewLabel(role)}
              </p>
              <p className="mt-1 text-sm text-muted">
                Par défaut, toutes les pages du rôle sont cochées. Décochez celles que vous
                souhaitez masquer.
              </p>
            </div>

            {isDirector(viewer) ? (
              <>
                <label className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-surface p-4 text-sm">
                  <input
                    type="checkbox"
                    checked={!useCustomPages}
                    onChange={(e) => setUseCustomPages(!e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">Accès complet du rôle</span>
                    <span className="mt-1 block text-xs text-muted">
                      Recommandé. Toutes les pages habituelles restent visibles.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-2xl border border-border bg-surface-2 p-4 text-sm">
                  <input
                    type="checkbox"
                    checked={useCustomPages}
                    onChange={(e) => {
                      setUseCustomPages(e.target.checked);
                      if (e.target.checked) selectAllPages();
                    }}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">Personnaliser les pages visibles</span>
                    <span className="mt-1 block text-xs text-muted">
                      Choisir précisément : caisse, réclamations, ventes, factures, stock…
                    </span>
                  </span>
                </label>

                {useCustomPages && (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-muted">
                        {selectedPages.length} page{selectedPages.length > 1 ? "s" : ""}{" "}
                        sélectionnée{selectedPages.length > 1 ? "s" : ""}
                      </p>
                      <Button type="button" variant="secondary" size="sm" onClick={selectAllPages}>
                        Tout cocher
                      </Button>
                    </div>

                    {pageSections.map((section) => (
                      <div key={section.group} className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                          {section.label}
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {section.pages.map((page) => {
                            const checked = selectedPages.includes(page.key);
                            return (
                              <button
                                key={page.key}
                                type="button"
                                onClick={() => togglePage(page.key)}
                                className={cn(
                                  "rounded-2xl border p-4 text-left transition-all",
                                  checked
                                    ? "border-primary/40 bg-champagne/35 shadow-[0_6px_20px_rgba(179,140,74,0.1)]"
                                    : "border-border bg-surface hover:border-primary/20"
                                )}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-medium">{page.label}</p>
                                    <p className="mt-1 text-xs text-muted">{page.description}</p>
                                  </div>
                                  <span
                                    className={cn(
                                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                                      checked
                                        ? "border-primary bg-primary text-white"
                                        : "border-border bg-surface"
                                    )}
                                  >
                                    {checked ? <Check className="h-3.5 w-3.5" /> : null}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {selectedPages.length === 0 && (
                      <p className="text-sm text-danger">
                        Sélectionnez au moins une page, ou repassez en accès complet.
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="rounded-2xl border border-border bg-surface-2 p-4 text-sm text-muted">
                Seul le directeur peut personnaliser les pages. Ce compte aura l&apos;accès
                complet du rôle {getRolePreviewLabel(role)}.
              </p>
            )}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>

          <div className="flex gap-3">
            {step === 2 && (
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4" />
                Retour
              </Button>
            )}

            {step === 1 ? (
              skipPageStep ? (
                <Button
                  type="button"
                  loading={loading}
                  onClick={handleCreate}
                  disabled={!canContinueStep1()}
                >
                  Créer le caissier
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!canContinueStep1()}
                >
                  Continuer
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )
            ) : (
              <Button
                type="button"
                loading={loading}
                onClick={handleCreate}
                disabled={useCustomPages && selectedPages.length === 0}
              >
                Créer l&apos;utilisateur
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function getRolePreviewLabel(role: CreateRole): string {
  if (role === "manager") return "gérant";
  if (role === "livreur") return "livreur";
  return "caissier";
}
