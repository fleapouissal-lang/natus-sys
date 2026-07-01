import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getCategoryBucketSlug,
  PRODUCT_CATEGORIES,
  type ProductCategory,
} from "@/lib/constants/products";
import { getAssignableCategoryNames } from "@/lib/products/assignable-categories";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024;
const POS_CATEGORY_CARDS_BUCKET = "pos-category-cards";

const IMAGE_TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

function normalizeImageMimeType(type: string): string {
  if (type === "image/pjpeg" || type === "image/jpg") return "image/jpeg";
  return type;
}

function resolveImageFileType(
  file: File
): { contentType: string; ext: string } | { error: string } {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const fromType = normalizeImageMimeType(file.type);

  if (ALLOWED_TYPES.includes(fromType)) {
    const resolvedExt =
      ext && IMAGE_TYPE_BY_EXT[ext]
        ? ext
        : fromType === "image/jpeg"
          ? "jpg"
          : fromType.replace("image/", "");
    return { contentType: fromType, ext: resolvedExt || "jpg" };
  }

  if (ext && IMAGE_TYPE_BY_EXT[ext]) {
    return { contentType: IMAGE_TYPE_BY_EXT[ext], ext };
  }

  return { error: "Format d'image non supporté (JPG, PNG, WebP, GIF)" };
}

function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isKnownProductCategoryBucket(category: string): category is ProductCategory {
  return PRODUCT_CATEGORIES.includes(category as ProductCategory);
}

export async function isAssignableProductCategory(
  supabase: SupabaseClient,
  category: string
): Promise<boolean> {
  const assignable = await getAssignableCategoryNames(supabase);
  return assignable.has(category);
}

/** @deprecated Préférer isAssignableProductCategory pour les catégories POS dynamiques. */
export function isValidProductCategory(category: string): category is ProductCategory {
  return isKnownProductCategoryBucket(category);
}

export async function uploadProductImage(
  supabase: SupabaseClient,
  category: string,
  file: File,
  fileBaseName: string
): Promise<{ url?: string; error?: string }> {
  if (!(await isAssignableProductCategory(supabase, category))) {
    return { error: "Catégorie invalide pour le stockage" };
  }

  const resolved = resolveImageFileType(file);
  if ("error" in resolved) return { error: resolved.error };

  if (file.size > MAX_SIZE) {
    return { error: "Image trop volumineuse (max 5 Mo)" };
  }

  const safeName = sanitizeFileName(fileBaseName);
  const usesLegacyBucket = isKnownProductCategoryBucket(category);
  const bucket = usesLegacyBucket ? getCategoryBucketSlug(category) : POS_CATEGORY_CARDS_BUCKET;
  const path = usesLegacyBucket
    ? `${safeName}.${resolved.ext}`
    : `${getCategoryBucketSlug(category)}/products/${safeName}.${resolved.ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: resolved.contentType,
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
export const WRITEOFF_PHOTOS_BUCKET = "writeoff-photos";

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

export async function uploadWriteoffPhoto(
  supabase: SupabaseClient,
  storeId: string,
  writeoffId: string,
  file: File,
  index: number
): Promise<{ url?: string; path?: string; error?: string }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Format d'image non supporté (JPG, PNG, WebP, GIF)" };
  }

  if (file.size > MAX_SIZE) {
    return { error: "Image trop volumineuse (max 5 Mo)" };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${storeId}/${writeoffId}/${Date.now()}-${index}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(WRITEOFF_PHOTOS_BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (error) return { error: error.message };

  const { data } = supabase.storage.from(WRITEOFF_PHOTOS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

const NEWS_IMAGES_BUCKET = "news-images";

export async function uploadPosCategoryCardImage(
  supabase: SupabaseClient,
  slug: string,
  file: File
): Promise<{ url?: string; error?: string }> {
  const resolved = resolveImageFileType(file);
  if ("error" in resolved) return { error: resolved.error };

  if (file.size > MAX_SIZE) {
    return { error: "Image trop volumineuse (max 5 Mo)" };
  }

  const safeSlug = sanitizeFileName(slug || "category");
  const path = `${safeSlug}/cover-${Date.now()}.${resolved.ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(POS_CATEGORY_CARDS_BUCKET).upload(path, buffer, {
    contentType: resolved.contentType,
    upsert: false,
  });

  if (error) return { error: error.message };

  const { data } = supabase.storage.from(POS_CATEGORY_CARDS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}

export async function deletePosCategoryCardStorageFile(
  supabase: SupabaseClient,
  imageUrl: string | null | undefined
): Promise<void> {
  if (!imageUrl) return;

  const marker = `/storage/v1/object/public/${POS_CATEGORY_CARDS_BUCKET}/`;
  const index = imageUrl.indexOf(marker);
  if (index === -1) return;

  const path = decodeURIComponent(imageUrl.slice(index + marker.length));
  await supabase.storage.from(POS_CATEGORY_CARDS_BUCKET).remove([path]);
}

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
