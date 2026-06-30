"use server";

import { revalidatePath } from "next/cache";
import {
  getCategoryBucketSlug,
  PRODUCT_CATEGORIES,
  UNCATEGORIZED_PRODUCT_CATEGORY,
} from "@/lib/constants/products";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  deletePosCategoryCardStorageFile,
  uploadPosCategoryCardImage,
} from "@/lib/storage";
import { listProductsInCategory } from "@/lib/pos/pos-category-cards/queries";
import { POS_MIN_CATEGORY_PRODUCTS } from "@/lib/pos/pos-category-cards/types";
import type { Product } from "@/lib/types";
import {
  ensureUncategorizedCategoryCard,
  normalizeCategoryName,
} from "@/lib/products/assignable-categories";
import { getProductCategories } from "@/lib/products/product-utils";

function actionError(message: string): { error: string } {
  return { error: message };
}

function revalidateCategoryPaths() {
  revalidatePath("/director/categories");
  revalidatePath("/cashier/pos");
  revalidatePath("/director");
  revalidatePath("/director/products");
  revalidatePath("/manager/products");
}

export async function createPosCategoryCard(formData: FormData): Promise<
  { success: true; id: string } | { error: string }
> {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) return actionError("Non autorisé");

  const name = normalizeCategoryName(String(formData.get("name") ?? ""));
  if (!name) return actionError("Nom de catégorie invalide");
  if (name === UNCATEGORIZED_PRODUCT_CATEGORY) {
    return actionError("Ce nom de catégorie est réservé");
  }

  const supabase = await createClient();
  const slug = getCategoryBucketSlug(name);

  const { data: existing } = await supabase
    .from("pos_category_cards")
    .select("id, image_url")
    .eq("name", name)
    .maybeSingle();

  const imageFile = formData.get("image");
  let imageUrl: string | null = existing?.image_url ?? null;

  if (imageFile instanceof File && imageFile.size > 0) {
    const upload = await uploadPosCategoryCardImage(createAdminClient(), slug, imageFile);
    if (upload.error) return actionError(upload.error);
    imageUrl = upload.url ?? null;
  }

  if (existing) {
    if (imageUrl && imageUrl !== existing.image_url) {
      const { error } = await supabase
        .from("pos_category_cards")
        .update({
          image_url: imageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) return actionError(error.message);
    }
    revalidateCategoryPaths();
    return { success: true, id: existing.id };
  }

  const { data: maxSortRow } = await supabase
    .from("pos_category_cards")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (maxSortRow?.sort_order ?? PRODUCT_CATEGORIES.length) + 1;

  const { data, error } = await supabase
    .from("pos_category_cards")
    .insert({
      name,
      slug,
      image_url: imageUrl,
      sort_order: sortOrder,
      min_product_count: POS_MIN_CATEGORY_PRODUCTS,
    })
    .select("id")
    .single();

  if (error || !data) {
    return actionError(error?.message ?? "Impossible de créer la catégorie");
  }

  revalidateCategoryPaths();
  return { success: true, id: data.id };
}

export async function updatePosCategoryCardImage(formData: FormData): Promise<
  { success: true } | { error: string }
> {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) return actionError("Non autorisé");

  const id = String(formData.get("id") ?? "").trim();
  const imageFile = formData.get("image");

  if (!id) return actionError("Catégorie introuvable");
  if (!(imageFile instanceof File) || imageFile.size === 0) {
    return actionError("Sélectionnez une image");
  }

  const supabase = await createClient();
  const { data: row, error: fetchError } = await supabase
    .from("pos_category_cards")
    .select("id, slug, name, image_url")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !row) return actionError("Catégorie introuvable");

  const slug = row.slug || getCategoryBucketSlug(row.name);
  const admin = createAdminClient();

  if (row.image_url) {
    await deletePosCategoryCardStorageFile(admin, row.image_url);
  }

  const upload = await uploadPosCategoryCardImage(admin, slug, imageFile);
  if (upload.error || !upload.url) return actionError(upload.error ?? "Upload échoué");

  const { error } = await supabase
    .from("pos_category_cards")
    .update({
      image_url: upload.url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return actionError(error.message);

  revalidateCategoryPaths();
  return { success: true };
}

export async function removePosCategoryCardImage(id: string): Promise<
  { success: true } | { error: string }
> {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) return actionError("Non autorisé");

  if (!id.trim()) return actionError("Catégorie introuvable");

  const supabase = await createClient();
  const { data: row, error: fetchError } = await supabase
    .from("pos_category_cards")
    .select("id, image_url")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !row) return actionError("Catégorie introuvable");

  if (row.image_url) {
    await deletePosCategoryCardStorageFile(createAdminClient(), row.image_url);
  }

  const { error } = await supabase
    .from("pos_category_cards")
    .update({
      image_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return actionError(error.message);

  revalidateCategoryPaths();
  return { success: true };
}

export async function deletePosCategoryCard(categoryId: string): Promise<
  { success: true; reassignedProducts: number } | { error: string }
> {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) return actionError("Non autorisé");

  const id = categoryId.trim();
  if (!id) return actionError("Catégorie introuvable");

  const supabase = await createClient();
  const { data: row, error: fetchError } = await supabase
    .from("pos_category_cards")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !row) return actionError("Catégorie introuvable");

  if (row.name === UNCATEGORIZED_PRODUCT_CATEGORY) {
    return actionError("Impossible de supprimer la catégorie par défaut");
  }

  const products = await listProductsInCategory(row.name);
  await ensureUncategorizedCategoryCard(supabase);

  for (const product of products) {
    const current = getProductCategories(product as Product);
    let next = current.filter((category) => category !== row.name);
    if (next.length === 0) {
      next = [UNCATEGORIZED_PRODUCT_CATEGORY];
    }

    const { error: updateError } = await supabase
      .from("products")
      .update({ categories: next })
      .eq("id", product.id);

    if (updateError) return actionError(updateError.message);
  }

  const { error: categoryError } = await supabase
    .from("pos_category_cards")
    .delete()
    .eq("id", id);
  if (categoryError) return actionError(categoryError.message);

  revalidateCategoryPaths();
  return { success: true, reassignedProducts: products.length };
}
