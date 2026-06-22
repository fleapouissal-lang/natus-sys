"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { isDirector } from "@/lib/permissions";
import { getStoreById } from "@/lib/inventory";
import { uploadNewsImage } from "@/lib/storage";
import {
  isValidAudienceCity,
  parseTargetRoles,
} from "@/lib/news/audience";
import type { NewsAudienceType } from "@/lib/news/types";
import type { UserRole } from "@/lib/types";

const MANAGEMENT: UserRole[] = ["directeur", "admin", "manager"];

function revalidateNews() {
  revalidatePath("/manager/actualites");
  revalidatePath("/director/actualites");
  revalidatePath("/cashier/actualites");
  revalidatePath("/hub/actualites");
  revalidatePath("/livreur/actualites");
}

function parseAudienceType(raw: FormDataEntryValue | null): NewsAudienceType | null {
  const value = String(raw ?? "");
  const allowed: NewsAudienceType[] = [
    "all",
    "city",
    "managers_city",
    "cashiers_city",
    "hub_city",
    "livreurs_city",
    "store",
    "roles",
  ];
  return allowed.includes(value as NewsAudienceType)
    ? (value as NewsAudienceType)
    : null;
}

async function validateAudience(
  profile: Awaited<ReturnType<typeof requireRole>>,
  audienceType: NewsAudienceType,
  targetCity: string | null,
  targetStoreId: string | null,
  targetRoles: UserRole[]
): Promise<{ error?: string; targetCity?: string | null; targetStoreId?: string | null }> {
  if (!profile) return { error: "Non autorisé" };

  if (!isDirector(profile) && audienceType === "all") {
    return { error: "Seule la direction peut publier pour toute l'équipe" };
  }

  if (!isDirector(profile) && audienceType === "roles") {
    return { error: "Seule la direction peut cibler des rôles personnalisés" };
  }

  const needsCity = [
    "city",
    "managers_city",
    "cashiers_city",
    "hub_city",
    "livreurs_city",
  ].includes(audienceType);

  if (needsCity) {
    if (!targetCity || !isValidAudienceCity(targetCity)) {
      return { error: "Ville cible invalide" };
    }
    if (!isDirector(profile) && profile.city !== targetCity) {
      return { error: "Vous ne pouvez publier que pour votre ville" };
    }
  }

  if (audienceType === "store") {
    if (!targetStoreId) return { error: "Magasin cible requis" };
    const store = await getStoreById(targetStoreId);
    if (!store) return { error: "Magasin introuvable" };
    if (!isDirector(profile) && profile.city !== store.city) {
      return { error: "Ce magasin n'est pas dans votre ville" };
    }
    return { targetCity: store.city, targetStoreId };
  }

  if (audienceType === "roles" && targetRoles.length === 0) {
    return { error: "Sélectionnez au moins un rôle" };
  }

  return { targetCity: needsCity ? targetCity : null, targetStoreId: null };
}

export async function createNewsAnnouncement(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const profile = await requireRole(MANAGEMENT);
  if (!profile) return { error: "Non autorisé" };

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const audienceType = parseAudienceType(formData.get("audience_type"));
  const targetCity = String(formData.get("target_city") ?? "").trim() || null;
  const targetStoreId = String(formData.get("target_store_id") ?? "").trim() || null;
  const targetRoles = parseTargetRoles(
    typeof formData.get("target_roles") === "string"
      ? (formData.get("target_roles") as string)
      : null
  );
  const isPinned = formData.get("is_pinned") === "on";

  if (title.length < 2) return { error: "Titre trop court" };
  if (body.length < 4) return { error: "Contenu trop court" };
  if (!audienceType) return { error: "Audience invalide" };

  const audienceCheck = await validateAudience(
    profile,
    audienceType,
    targetCity,
    targetStoreId,
    targetRoles
  );
  if (audienceCheck.error) return { error: audienceCheck.error };

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: announcement, error: insertError } = await supabase
    .from("news_announcements")
    .insert({
      title,
      body,
      audience_type: audienceType,
      target_city: audienceCheck.targetCity ?? null,
      target_store_id: audienceCheck.targetStoreId ?? null,
      target_roles: audienceType === "roles" ? targetRoles : null,
      is_pinned: isPinned,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (insertError || !announcement) {
    return { error: insertError?.message ?? "Échec de la publication" };
  }

  const imageFiles = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const upload = await uploadNewsImage(
      admin,
      file,
      `${announcement.id}-${i + 1}`
    );
    if (upload.error || !upload.url) {
      return { error: upload.error ?? "Échec upload image" };
    }

    const { error: imageError } = await supabase
      .from("news_announcement_images")
      .insert({
        announcement_id: announcement.id,
        image_url: upload.url,
        sort_order: i,
      });

    if (imageError) return { error: imageError.message };
  }

  revalidateNews();
  return { success: true };
}

export async function deleteNewsAnnouncement(
  id: string
): Promise<{ error?: string; success?: boolean }> {
  const profile = await requireRole(MANAGEMENT);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("news_announcements")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidateNews();
  return { success: true };
}

export async function toggleNewsAnnouncementPin(
  id: string,
  pinned: boolean
): Promise<{ error?: string; success?: boolean }> {
  const profile = await requireRole(MANAGEMENT);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("news_announcements")
    .update({ is_pinned: pinned, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidateNews();
  return { success: true };
}
