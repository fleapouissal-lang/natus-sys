"use server";

import { revalidatePath } from "next/cache";
import {
  getCategoryBucketSlug,
  PRODUCT_CATEGORIES,
} from "@/lib/constants/products";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uploadPosCategoryCardImage } from "@/lib/storage";
import { listProductsInCategory } from "@/lib/pos/pos-category-cards/queries";
import { POS_MIN_CATEGORY_PRODUCTS } from "@/lib/pos/pos-category-cards/types";

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

function normalizeCategoryName(raw: string): string | null {
  const trimmed = raw.replace(/\s+/g, " ").trim();
  if (trimmed.length < 2 || trimmed.length > 48) return null;
  return trimmed
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export async function createPosCategoryCard(formData: FormData): Promise<
  { success: true; id: string } | { error: string }
> {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) return actionError("Non autorisé");

  const name = normalizeCategoryName(String(formData.get("name") ?? ""));
  if (!name) return actionError("Nom de catégorie invalide");

  const supabase = await createClient();
  const slug = getCategoryBucketSlug(name);

  const { data: existing } = await supabase
    .from("pos_category_cards")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (existing) return actionError("Cette catégorie existe déjà");

  const { data: maxSortRow } = await supabase
    .from("pos_category_cards")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (maxSortRow?.sort_order ?? PRODUCT_CATEGORIES.length) + 1;

  const imageFile = formData.get("image");
  let imageUrl: string | null = null;

  if (imageFile instanceof File && imageFile.size > 0) {
    const upload = await uploadPosCategoryCardImage(supabase, slug, imageFile);
    if (upload.error) return actionError(upload.error);
    imageUrl = upload.url ?? null;
  }

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
    .select("id, slug")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !row) return actionError("Catégorie introuvable");

  const upload = await uploadPosCategoryCardImage(supabase, row.slug, imageFile);
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
  { success: true; deletedProducts: number } | { error: string }
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

  const products = await listProductsInCategory(row.name);
  const productIds = products.map((product) => product.id);

  if (productIds.length > 0) {
    const { count: soldLines, error: soldError } = await supabase
      .from("sale_items")
      .select("id", { count: "exact", head: true })
      .in("product_id", productIds);

    if (soldError) return actionError(soldError.message);

    if ((soldLines ?? 0) > 0) {
      return actionError(
        `Impossible de supprimer : ${soldLines} ligne(s) de vente existent pour des produits de « ${row.name} ».`
      );
    }

    const { error: inventoryError } = await supabase
      .from("store_inventory")
      .delete()
      .in("product_id", productIds);
    if (inventoryError) return actionError(inventoryError.message);

    const { error: movementsError } = await supabase
      .from("stock_movements")
      .delete()
      .in("product_id", productIds);
    if (movementsError) return actionError(movementsError.message);

    const { error: productsError } = await supabase
      .from("products")
      .delete()
      .in("id", productIds);
    if (productsError) return actionError(productsError.message);
  }

  const { error: categoryError } = await supabase
    .from("pos_category_cards")
    .delete()
    .eq("id", id);
  if (categoryError) return actionError(categoryError.message);

  revalidateCategoryPaths();
  return { success: true, deletedProducts: productIds.length };
}
