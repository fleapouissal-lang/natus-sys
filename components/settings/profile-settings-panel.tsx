"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, KeyRound, Trash2, UserRound } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  changeOwnPassword,
  removeOwnAvatar,
  uploadOwnAvatar,
} from "@/lib/profile/actions";
import { getRoleLabel } from "@/lib/permissions";
import type { Profile } from "@/lib/types";

export function ProfileSettingsPanel({
  profile,
  storeName,
}: {
  profile: Profile;
  storeName?: string;
}) {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState("");
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const displayName = profile.full_name || profile.email;

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarLoading(true);
    setAvatarError("");

    const formData = new FormData();
    formData.set("avatar", file);
    const result = await uploadOwnAvatar(formData);

    if (result.error) {
      setAvatarError(result.error);
      setAvatarLoading(false);
      return;
    }

    router.refresh();
    setAvatarLoading(false);
    e.target.value = "";
  }

  async function handleRemoveAvatar() {
    if (!confirm("Supprimer votre photo de profil ?")) return;
    setAvatarLoading(true);
    setAvatarError("");
    const result = await removeOwnAvatar();
    if (result.error) {
      setAvatarError(result.error);
      setAvatarLoading(false);
      return;
    }
    router.refresh();
    setAvatarLoading(false);
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    setPasswordLoading(true);

    const result = await changeOwnPassword(new FormData(e.currentTarget));

    if (result.error) {
      setPasswordError(result.error);
      setPasswordLoading(false);
      return;
    }

    setPasswordSuccess("Mot de passe mis à jour avec succès");
    e.currentTarget.reset();
    setPasswordLoading(false);
  }

  return (
    <div className="animate-fade-in mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-primary">Paramètres</h1>
        <p className="mt-1 text-sm text-muted">
          Gérez votre photo de profil et votre mot de passe
        </p>
      </div>

      <Card>
        <CardHeader title="Profil" description="Photo affichée dans le tableau de bord" />
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative">
            <UserAvatar
              name={displayName}
              avatarUrl={profile.avatar_url}
              size="lg"
              className="h-24 w-24 text-xl ring-2 ring-[#B38C4A]/25"
            />
            <label
              htmlFor="avatar-upload"
              className="absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[#B38C4A]/35 bg-champagne text-black shadow-sm transition hover:brightness-95"
              title="Changer la photo"
            >
              <Camera className="h-4 w-4" />
            </label>
            <input
              ref={avatarInputRef}
              id="avatar-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={avatarLoading}
              onChange={handleAvatarChange}
            />
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-lg font-semibold text-foreground">{displayName}</p>
            <p className="text-sm text-muted">{profile.email}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[#8B6914]">
              {getRoleLabel(profile.role)}
            </p>
            {storeName && (
              <p className="mt-1 text-sm text-muted">{storeName}</p>
            )}
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Button
                type="button"
                size="sm"
                loading={avatarLoading}
                onClick={() => avatarInputRef.current?.click()}
              >
                <UserRound className="h-4 w-4" />
                Choisir une photo
              </Button>
              {profile.avatar_url && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  loading={avatarLoading}
                  onClick={handleRemoveAvatar}
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </Button>
              )}
            </div>
            <p className="mt-2 text-xs text-muted">JPG, PNG ou WebP — max 2 Mo</p>
            {avatarError && (
              <p className="mt-2 text-sm text-danger">{avatarError}</p>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Mot de passe"
          description="Modifiez votre mot de passe de connexion"
        />
        <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-4">
          <PasswordInput
            label="Mot de passe actuel"
            name="current_password"
            required
            autoComplete="current-password"
          />
          <PasswordInput
            label="Nouveau mot de passe"
            name="new_password"
            required
            autoComplete="new-password"
            placeholder="Minimum 8 caractères"
          />
          <PasswordInput
            label="Confirmer le mot de passe"
            name="confirm_password"
            required
            autoComplete="new-password"
          />

          {passwordError && (
            <p className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
              {passwordError}
            </p>
          )}
          {passwordSuccess && (
            <p className="rounded-lg border border-success/20 bg-success/5 px-3 py-2 text-sm text-success">
              {passwordSuccess}
            </p>
          )}

          <Button type="submit" loading={passwordLoading}>
            <KeyRound className="h-4 w-4" />
            Mettre à jour le mot de passe
          </Button>
        </form>
      </Card>
    </div>
  );
}
