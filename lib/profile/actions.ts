"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getSettingsPath } from "@/lib/layout/settings-path";
import { deleteProfileAvatarFile, uploadProfileAvatar } from "@/lib/storage";

function revalidateProfilePaths(role: string) {
  revalidatePath(getSettingsPath(role as Parameters<typeof getSettingsPath>[0]));
  revalidatePath("/director", "layout");
  revalidatePath("/manager", "layout");
  revalidatePath("/cashier", "layout");
  revalidatePath("/hub", "layout");
  revalidatePath("/livreur", "layout");
}

export async function changeOwnPassword(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Non autorisé" };

  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!currentPassword || !newPassword) {
    return { error: "Veuillez remplir tous les champs" };
  }

  if (newPassword.length < 8) {
    return { error: "Le nouveau mot de passe doit contenir au moins 8 caractères" };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Les mots de passe ne correspondent pas" };
  }

  const supabase = await createClient();

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: currentPassword,
  });

  if (verifyError) {
    return { error: "Mot de passe actuel incorrect" };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };

  return { success: true };
}

export async function uploadOwnAvatar(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Non autorisé" };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Veuillez sélectionner une image" };
  }

  const supabase = await createClient();

  if (profile.avatar_url) {
    await deleteProfileAvatarFile(supabase, profile.avatar_url);
  }

  const upload = await uploadProfileAvatar(supabase, profile.id, file);
  if (upload.error || !upload.url) {
    return { error: upload.error || "Échec de l'upload" };
  }

  const { error } = await supabase.rpc("update_own_avatar_url", {
    p_avatar_url: upload.url,
  });

  if (error) return { error: error.message };

  revalidateProfilePaths(profile.role);
  return { success: true, avatarUrl: upload.url };
}

export async function removeOwnAvatar() {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();

  if (profile.avatar_url) {
    await deleteProfileAvatarFile(supabase, profile.avatar_url);
  }

  const { error } = await supabase.rpc("update_own_avatar_url", {
    p_avatar_url: null,
  });

  if (error) return { error: error.message };

  revalidateProfilePaths(profile.role);
  return { success: true };
}
