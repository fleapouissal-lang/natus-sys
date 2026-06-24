import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getCategoryBucketSlug,
  PRODUCT_CATEGORIES,
  type ProductCategory,
} from "@/lib/constants/products";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024;

function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidProductCategory(category: string): category is ProductCategory {
  return PRODUCT_CATEGORIES.includes(category as ProductCategory);
}

export async function uploadProductImage(
  supabase: SupabaseClient,
  category: string,
  file: File,
  fileBaseName: string
): Promise<{ url?: string; error?: string }> {
  if (!isValidProductCategory(category)) {
    return { error: "Catégorie invalide pour le stockage" };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Format d'image non supporté (JPG, PNG, WebP, GIF)" };
  }

  if (file.size > MAX_SIZE) {
    return { error: "Image trop volumineuse (max 5 Mo)" };
  }

  const bucket = getCategoryBucketSlug(category);
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${sanitizeFileName(fileBaseName)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) return { error: error.message };

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl };
}

const PROFILE_AVATARS_BUCKET = "profile-avatars";

export async function uploadProfileAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<{ url?: string; error?: string }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Format d'image non supporté (JPG, PNG, WebP, GIF)" };
  }

  if (file.size > 2 * 1024 * 1024) {
    return { error: "Image trop volumineuse (max 2 Mo)" };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/avatar.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(PROFILE_AVATARS_BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) return { error: error.message };

  const { data } = supabase.storage.from(PROFILE_AVATARS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}

export async function deleteProfileAvatarFile(
  supabase: SupabaseClient,
  avatarUrl: string
): Promise<void> {
  const marker = `/storage/v1/object/public/${PROFILE_AVATARS_BUCKET}/`;
  const index = avatarUrl.indexOf(marker);
  if (index === -1) return;

  const path = decodeURIComponent(avatarUrl.slice(index + marker.length));
  await supabase.storage.from(PROFILE_AVATARS_BUCKET).remove([path]);
}

const COMPLAINT_PHOTOS_BUCKET = "complaint-photos";

export async function uploadComplaintPhoto(
  supabase: SupabaseClient,
  file: File,
  fileBaseName: string
): Promise<{ url?: string; error?: string }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Format d'image non supporté (JPG, PNG, WebP, GIF)" };
  }

  if (file.size > MAX_SIZE) {
    return { error: "Image trop volumineuse (max 5 Mo)" };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${sanitizeFileName(fileBaseName)}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(COMPLAINT_PHOTOS_BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (error) return { error: error.message };

  const { data } = supabase.storage.from(COMPLAINT_PHOTOS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}

const NEWS_IMAGES_BUCKET = "news-images";

export async function uploadNewsImage(
  supabase: SupabaseClient,
  file: File,
  fileBaseName: string
): Promise<{ url?: string; error?: string }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Format d'image non supporté (JPG, PNG, WebP, GIF)" };
  }

  if (file.size > MAX_SIZE) {
    return { error: "Image trop volumineuse (max 5 Mo)" };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${sanitizeFileName(fileBaseName)}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(NEWS_IMAGES_BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (error) return { error: error.message };

  const { data } = supabase.storage.from(NEWS_IMAGES_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}

export async function deleteProductImage(
  supabase: SupabaseClient,
  category: string,
  imageUrl: string
): Promise<void> {
  if (!isValidProductCategory(category)) return;

  const bucket = getCategoryBucketSlug(category);
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = imageUrl.indexOf(marker);
  if (index === -1) return;

  const path = decodeURIComponent(imageUrl.slice(index + marker.length));
  await supabase.storage.from(bucket).remove([path]);
}
