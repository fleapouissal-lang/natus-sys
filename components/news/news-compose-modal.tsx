"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectMenu } from "@/components/ui/select-menu";
import { NewsMultiImageUpload } from "@/components/news/news-multi-image-upload";
import { createNewsAnnouncement } from "@/lib/news/actions";
import {
  AUDIENCE_OPTIONS,
  getAudienceOptionsForProfile,
  TARGETABLE_ROLES,
} from "@/lib/news/audience";
import { NATUS_CITIES } from "@/lib/constants/cities";
import type { NewsAudienceType } from "@/lib/news/types";
import type { Profile, Store, UserRole } from "@/lib/types";
import { getRoleLabel } from "@/lib/permissions";

interface NewsComposeModalProps {
  profile: Profile;
  stores: Pick<Store, "id" | "name" | "city">[];
  onClose: () => void;
}

export function NewsComposeModal({
  profile,
  stores,
  onClose,
}: NewsComposeModalProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [audienceType, setAudienceType] = useState<NewsAudienceType>(
    profile.city ? "city" : "all"
  );
  const [targetCity, setTargetCity] = useState(profile.city ?? NATUS_CITIES[0]);
  const [targetStoreId, setTargetStoreId] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);

  const audienceOptions = useMemo(
    () => getAudienceOptionsForProfile(profile),
    [profile]
  );

  const selectedAudience = AUDIENCE_OPTIONS.find(
    (opt) => opt.value === audienceType
  );

  const cityOptions = useMemo(() => {
    const cities =
      profile.role === "manager" && profile.city
        ? [profile.city]
        : [...NATUS_CITIES];
    return cities.map((city) => ({ value: city, label: city }));
  }, [profile]);

  const storeOptions = useMemo(() => {
    const filtered = profile.city
      ? stores.filter((s) => s.city === profile.city)
      : stores;
    return [
      { value: "", label: "Choisir un magasin" },
      ...filtered.map((s) => ({
        value: s.id,
        label: `${s.name} (${s.city})`,
      })),
    ];
  }, [stores, profile.city]);

  function toggleRole(role: UserRole) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("audience_type", audienceType);
    formData.set("target_city", targetCity);
    formData.set("target_store_id", targetStoreId);
    formData.set("target_roles", JSON.stringify(selectedRoles));

    startTransition(async () => {
      const result = await createNewsAnnouncement(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Publier une actualité</h2>
            <p className="text-sm text-muted">
              Journal interne — choisissez qui verra ce message
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-surface-2"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="news-title">
              Titre
            </label>
            <input
              id="news-title"
              name="title"
              required
              maxLength={120}
              placeholder="Ex. Nouvelle procédure caisse"
              className="natus-input w-full"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="news-body">
              Contenu
            </label>
            <textarea
              id="news-body"
              name="body"
              required
              rows={5}
              maxLength={4000}
              placeholder="Rédigez votre message pour l'équipe…"
              className="natus-input w-full resize-y"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Audience</label>
              <SelectMenu
                value={audienceType}
                onChange={(v) => setAudienceType(v as NewsAudienceType)}
                options={audienceOptions.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
              />
              {selectedAudience && (
                <p className="mt-1 text-xs text-muted">
                  {selectedAudience.description}
                </p>
              )}
            </div>

            {selectedAudience?.needsCity && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Ville</label>
                <SelectMenu
                  value={targetCity}
                  onChange={setTargetCity}
                  options={cityOptions}
                />
              </div>
            )}

            {selectedAudience?.needsStore && (
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Magasin</label>
                <SelectMenu
                  value={targetStoreId}
                  onChange={setTargetStoreId}
                  options={storeOptions}
                />
              </div>
            )}
          </div>

          {selectedAudience?.needsRoles && (
            <div>
              <p className="mb-2 text-sm font-medium">Rôles ciblés</p>
              <div className="flex flex-wrap gap-2">
                {TARGETABLE_ROLES.map((role) => {
                  const active = selectedRoles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                        active
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-muted hover:border-accent/40"
                      }`}
                    >
                      {getRoleLabel(role)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium">Photos</label>
            <NewsMultiImageUpload onError={setError} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_pinned" className="rounded" />
            Épingler en tête du journal
          </label>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Publication…" : "Publier"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
