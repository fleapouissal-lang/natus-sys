"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { canCreateRole, canCreateStore, canCreateStoreInCity, canAccessStore, canManageStore, isDirector, isHub, isManager } from "@/lib/permissions";
import { getActiveStockModifyGrant } from "@/lib/stock-modify-access/queries";
import {
  parseAllowedPagesInput,
  validateAllowedPagesForRole,
  isStoreScopedManager,
} from "@/lib/user-page-access";
import { NATUS_CITIES } from "@/lib/constants/cities";
import { getStoreById } from "@/lib/inventory";
import { PRODUCT_BRAND, PRODUCT_CATEGORIES } from "@/lib/constants/products";
import { buildParentBarcode } from "@/lib/products/product-utils";
import { uploadProductImage } from "@/lib/storage";
import type { PaymentMethod, Profile } from "@/lib/types";
import {
  resolveLoyaltyLookupResult,
  type LoyaltyLookupResult,
} from "@/lib/loyalty/lookup-result";

const MANAGEMENT = ["directeur", "admin", "manager"] as const;
const STOCK_READ = ["directeur", "admin", "manager", "hub"] as const;
const STOCK_MODIFY = ["directeur", "admin", "hub", "manager"] as const;

type StoreStockRow = { store_id: string; quantity: number };

function parseStoreStocks(formData: FormData): StoreStockRow[] {
  const raw = formData.get("store_stocks");
  if (typeof raw !== "string" || !raw.trim()) return [];

  try {
    const parsed = JSON.parse(raw) as StoreStockRow[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (row) =>
          row &&
          typeof row.store_id === "string" &&
          typeof row.quantity === "number" &&
          row.quantity > 0
      )
      .map((row) => ({
        store_id: row.store_id,
        quantity: Math.floor(row.quantity),
      }));
  } catch {
    return [];
  }
}

function normalizeUserEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mapCreateUserAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("email") && (lower.includes("invalid") || lower.includes("format"))) {
    return "Adresse email invalide. Vérifiez le format (ex. hub.marrakech@natus.ma).";
  }
  if (
    lower.includes("already") ||
    lower.includes("exists") ||
    lower.includes("registered") ||
    lower.includes("duplicate")
  ) {
    return "Cet email est déjà utilisé";
  }
  return message;
}

function revalidateManagement() {
  revalidatePath("/manager/products");
  revalidatePath("/manager/stock");
  revalidatePath("/manager/stock-transfers");
  revalidatePath("/manager/stock-transfers/received");
  revalidatePath("/manager/hub-orders");
  revalidatePath("/manager/activity");
  revalidatePath("/manager/stores");
  revalidatePath("/manager/users");
  revalidatePath("/manager/planning");
  revalidatePath("/director/products");
  revalidatePath("/director/stock");
  revalidatePath("/director/stock-transfers");
  revalidatePath("/director/stock-transfers/received");
  revalidatePath("/director/activity");
  revalidatePath("/director/stores");
  revalidatePath("/director/users");
  revalidatePath("/director/planning");
  revalidatePath("/director/hubs");
  revalidatePath("/hub");
  revalidatePath("/hub/stock");
  revalidatePath("/hub/hub-stock");
  revalidatePath("/hub/orders");
  revalidatePath("/hub/activity");
  revalidatePath("/cashier/transfers");
  revalidatePath("/cashier/transfers/sent");
  revalidatePath("/cashier/transfers/received");
  revalidatePath("/livreur/transfers");
  revalidatePath("/cashier/pos");
}

function revalidateWriteoffPaths() {
  revalidatePath("/cashier/returns");
  revalidatePath("/manager/writeoffs");
  revalidatePath("/director/writeoffs");
  revalidatePath("/hub/writeoffs");
  revalidatePath("/manager/stock");
  revalidatePath("/director/stock");
  revalidatePath("/hub/hub-stock");
}

async function assertStoreAccess(profile: Profile, storeId: string) {
  const store = await getStoreById(storeId);
  if (!store) return { error: "Magasin introuvable" };
  if (!canManageStore(profile, store)) {
    return { error: "Vous n'avez pas accès à ce magasin" };
  }
  return { store };
}

async function assertStoreTransferAccess(
  profile: Profile,
  fromStoreId: string,
  toStoreId: string
) {
  if (fromStoreId === toStoreId) {
    return { error: "Choisissez deux magasins différents" };
  }

  const fromStore = await getStoreById(fromStoreId);
  const toStore = await getStoreById(toStoreId);

  if (!fromStore || !toStore) {
    return { error: "Magasin introuvable" };
  }

  if (fromStore.is_hub || toStore.is_hub) {
    return { error: "Transfert réservé aux magasins de vente" };
  }

  if (!fromStore.is_active || !toStore.is_active) {
    return { error: "Magasin inactif" };
  }

  if (isDirector(profile)) {
    return { fromStore, toStore };
  }

  if (isManager(profile)) {
    if (isStoreScopedManager(profile) && profile.store_id) {
      if (profile.store_id !== fromStoreId) {
        return { error: "Vous ne pouvez transférer que depuis votre magasin" };
      }
      if (toStore.city !== profile.city) {
        return { error: "Magasin destination hors périmètre" };
      }
      return { fromStore, toStore };
    }

    if (!canManageStore(profile, fromStore) || !canManageStore(profile, toStore)) {
      return { error: "Magasins hors périmètre" };
    }

    return { fromStore, toStore };
  }

  return { error: "Non autorisé" };
}

async function assertStockModifyAccess(profile: Profile, storeId: string) {
  const access = await assertStoreAccess(profile, storeId);
  if (access.error) return access;

  if (isDirector(profile)) return access;

  const grant = await getActiveStockModifyGrant(profile, storeId);
  if (grant) {
    return { ...access, grant };
  }

  if (isManager(profile)) {
    return {
      error:
        "Modification stock non autorisée. Demandez un accès temporaire au directeur.",
    };
  }
  if (isHub(profile) && !access.store?.is_hub) {
    return { error: "Le compte dépôt ne peut modifier que le stock des dépôts" };
  }
  return access;
}

function movementAccessRequestId(
  access: Awaited<ReturnType<typeof assertStockModifyAccess>>
): string | null {
  if ("grant" in access && access.grant) return access.grant.requestId;
  return null;
}

function parseCategories(formData: FormData): string[] | null {
  const raw = formData
    .getAll("categories")
    .map((value) => (value as string).trim())
    .filter(Boolean);

  const unique = [...new Set(raw)];
  if (unique.length === 0) return null;

  for (const category of unique) {
    if (!PRODUCT_CATEGORIES.includes(category as (typeof PRODUCT_CATEGORIES)[number])) {
      return null;
    }
  }

  return unique;
}

function parseCategory(value: FormDataEntryValue | null): string | null {
  const category = (value as string)?.trim();
  if (!category) return null;
  if (!PRODUCT_CATEGORIES.includes(category as (typeof PRODUCT_CATEGORIES)[number])) {
    return null;
  }
  return category;
}

function parseImageUrl(value: FormDataEntryValue | null, required = false) {
  const url = (value as string)?.trim();
  if (!url) {
    return required ? { error: "L'image du produit est obligatoire" } : { url: null };
  }
  try {
    new URL(url);
  } catch {
    return { error: "URL d'image invalide" };
  }
  return { url };
}

async function resolveProductImageUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
  category: string,
  required: boolean
): Promise<{ url?: string | null; error?: string }> {
  const file = formData.get("image");
  const barcode = ((formData.get("barcode") as string) || "product").trim();

  if (file instanceof File && file.size > 0) {
    return uploadProductImage(supabase, category, file, barcode);
  }

  return parseImageUrl(formData.get("image_url"), required);
}

export async function createProduct(formData: FormData) {
  const profile = await requireRole([...MANAGEMENT]);
  if (!profile) return { error: "Non autorisé" };

  const productKind = ((formData.get("product_kind") as string) || "simple").trim();
  if (!["simple", "parent"].includes(productKind)) {
    return { error: "Type de produit invalide" };
  }

  const categories = parseCategories(formData);
  if (!categories) return { error: "Veuillez sélectionner au moins une catégorie" };

  const primaryCategory = categories[0];
  const supabase = await createClient();
  const storeStocks = parseStoreStocks(formData);

  if (productKind === "parent") {
    const imageResult = await resolveProductImageUrl(
      supabase,
      formData,
      primaryCategory,
      true
    );
    if ("error" in imageResult && imageResult.error) return { error: imageResult.error };
    if (!imageResult.url) return { error: "L'image du produit est obligatoire" };

    const { data: product, error } = await supabase
      .from("products")
      .insert({
        name: formData.get("name") as string,
        barcode: buildParentBarcode(),
        description: (formData.get("description") as string) || null,
        price: 0,
        stock: 0,
        categories,
        product_kind: "parent",
        brand: PRODUCT_BRAND,
        image_url: imageResult.url,
      })
      .select("*")
      .single();

    if (error || !product) return { error: error?.message || "Erreur création produit parent" };

    revalidateManagement();
    return { success: true, productId: product.id, product };
  }

  const barcode = ((formData.get("barcode") as string) || "").trim();
  if (!barcode) return { error: "Code-barres requis" };

  const { data: existing } = await supabase
    .from("products")
    .select("id, name, barcode, product_code, price, category, categories, stock, image_url, description, brand, product_kind, parent_id")
    .eq("barcode", barcode)
    .maybeSingle();

  if (existing) {
    return {
      error: "Ce produit est déjà ajouté dans le catalogue",
      existingProduct: existing,
    };
  }

  const productCode = ((formData.get("product_code") as string) || "").trim() || null;

  if (productCode) {
    const { data: codeDuplicate } = await supabase
      .from("products")
      .select("id")
      .eq("product_code", productCode)
      .maybeSingle();
    if (codeDuplicate) return { error: "Ce code produit est déjà utilisé" };
  }

  const imageResult = await resolveProductImageUrl(supabase, formData, primaryCategory, true);
  if ("error" in imageResult && imageResult.error) return { error: imageResult.error };
  if (!imageResult.url) return { error: "L'image du produit est obligatoire" };

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      name: formData.get("name") as string,
      product_code: productCode,
      barcode,
      description: (formData.get("description") as string) || null,
      price: parseFloat(formData.get("price") as string),
      stock: 0,
      categories,
      product_kind: "simple",
      brand: PRODUCT_BRAND,
      image_url: imageResult.url,
    })
    .select("id")
    .single();

  if (error || !product) return { error: error?.message || "Erreur création produit" };

  for (const row of storeStocks) {
    const access = await assertStoreAccess(profile, row.store_id);
    if (access.error) return { error: access.error };

    const { error: invError } = await supabase.from("store_inventory").upsert(
      { store_id: row.store_id, product_id: product.id, stock: row.quantity },
      { onConflict: "store_id,product_id" }
    );
    if (invError) return { error: invError.message };

    await supabase.from("stock_movements").insert({
      product_id: product.id,
      quantity: row.quantity,
      type: "add",
      notes: "Stock initial à la création",
      created_by: profile.id,
      store_id: row.store_id,
    });
  }

  revalidateManagement();
  return { success: true, productId: product.id };
}

export async function createProductVariant(parentId: string, formData: FormData) {
  const profile = await requireRole([...MANAGEMENT]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();

  const { data: parent, error: parentError } = await supabase
    .from("products")
    .select("id, name, categories, category, image_url, product_kind")
    .eq("id", parentId)
    .maybeSingle();

  if (parentError || !parent) return { error: "Produit parent introuvable" };
  if (parent.product_kind !== "parent") {
    return { error: "Ce produit n'est pas un parent" };
  }

  const barcode = ((formData.get("barcode") as string) || "").trim();
  if (!barcode) return { error: "Code-barres requis" };

  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .eq("barcode", barcode)
    .maybeSingle();

  if (existing) {
    return { error: "Ce code-barres est déjà utilisé" };
  }

  const categories =
    parseCategories(formData) ||
    (parent.categories?.length ? parent.categories : parent.category ? [parent.category] : null);

  if (!categories?.length) {
    return { error: "Le produit parent doit avoir au moins une catégorie" };
  }

  const primaryCategory = categories[0];
  const storeStocks = parseStoreStocks(formData);

  const imageResult = await resolveProductImageUrl(
    supabase,
    formData,
    primaryCategory,
    false
  );
  if ("error" in imageResult && imageResult.error) return { error: imageResult.error };

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      name: formData.get("name") as string,
      barcode,
      description: (formData.get("description") as string) || null,
      price: parseFloat(formData.get("price") as string),
      stock: 0,
      categories,
      product_kind: "variant",
      parent_id: parentId,
      brand: PRODUCT_BRAND,
      image_url: imageResult.url || parent.image_url,
    })
    .select("id")
    .single();

  if (error || !product) return { error: error?.message || "Erreur création variante" };

  for (const row of storeStocks) {
    const access = await assertStoreAccess(profile, row.store_id);
    if (access.error) return { error: access.error };

    const { error: invError } = await supabase.from("store_inventory").upsert(
      { store_id: row.store_id, product_id: product.id, stock: row.quantity },
      { onConflict: "store_id,product_id" }
    );
    if (invError) return { error: invError.message };

    await supabase.from("stock_movements").insert({
      product_id: product.id,
      quantity: row.quantity,
      type: "add",
      notes: `Stock initial variante — ${parent.name}`,
      created_by: profile.id,
      store_id: row.store_id,
    });
  }

  revalidateManagement();
  return { success: true, productId: product.id };
}

export async function updateProduct(id: string, formData: FormData) {
  const profile = await requireRole([...MANAGEMENT]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();

  const { data: existingProduct, error: existingError } = await supabase
    .from("products")
    .select("barcode, product_kind, parent_id")
    .eq("id", id)
    .maybeSingle();

  if (existingError || !existingProduct) {
    return { error: "Produit introuvable" };
  }

  const isParent = existingProduct.product_kind === "parent";

  const submittedBarcode = ((formData.get("barcode") as string) || "").trim();
  const barcode = isParent
    ? existingProduct.barcode
    : profile.role === "directeur"
      ? submittedBarcode
      : existingProduct.barcode;

  if (!isParent && !barcode) return { error: "Code-barres requis" };

  const categories = parseCategories(formData);
  if (!categories) return { error: "Veuillez sélectionner au moins une catégorie" };

  if (!isParent && barcode) {
    const { data: duplicate } = await supabase
      .from("products")
      .select("id")
      .eq("barcode", barcode)
      .neq("id", id)
      .maybeSingle();

    if (duplicate) {
      return { error: "Ce code-barres est déjà utilisé par un autre produit" };
    }
  }

  const primaryCategory = categories[0];
  const imageResult = await resolveProductImageUrl(supabase, formData, primaryCategory, false);
  if ("error" in imageResult && imageResult.error) return { error: imageResult.error };

  const updatePayload: Record<string, unknown> = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
    categories,
    brand: PRODUCT_BRAND,
  };

  const productCode = ((formData.get("product_code") as string) || "").trim() || null;
  if (!isParent) {
    if (productCode) {
      const { data: codeDuplicate } = await supabase
        .from("products")
        .select("id")
        .eq("product_code", productCode)
        .neq("id", id)
        .maybeSingle();
      if (codeDuplicate) return { error: "Ce code produit est déjà utilisé" };
    }
    updatePayload.product_code = productCode;
  }

  if (!isParent) {
    updatePayload.barcode = barcode;
    updatePayload.price = parseFloat(formData.get("price") as string);
  }

  if (imageResult.url) {
    updatePayload.image_url = imageResult.url;
  }

  const { error } = await supabase.from("products").update(updatePayload).eq("id", id);

  if (error) return { error: error.message };

  revalidateManagement();
  return { success: true };
}

export async function deleteProduct(id: string) {
  const profile = await requireRole([...MANAGEMENT]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidateManagement();
  return { success: true };
}

export async function createStore(formData: FormData) {
  const profile = await requireRole([...MANAGEMENT]);
  if (!profile) return { error: "Non autorisé" };

  const name = (formData.get("name") as string)?.trim();
  const city = (formData.get("city") as string)?.trim();
  const address = ((formData.get("address") as string) || "").trim() || null;

  if (!name) return { error: "Nom du magasin requis" };
  if (!city) return { error: "Ville requise" };
  if (!canCreateStore(profile)) {
    return { error: "Seul le directeur peut créer un magasin" };
  }
  if (!NATUS_CITIES.includes(city as (typeof NATUS_CITIES)[number])) {
    return { error: "Ville invalide" };
  }
  if (!canCreateStoreInCity(profile, city)) {
    return { error: "Vous ne pouvez créer un magasin que dans votre ville" };
  }

  const supabase = await createClient();
  const { data: store, error } = await supabase
    .from("stores")
    .insert({ name, city, address })
    .select("id")
    .single();

  if (error || !store) return { error: error?.message || "Erreur création magasin" };

  const { data: products } = await supabase.from("products").select("id");
  if (products && products.length > 0) {
    await supabase.from("store_inventory").upsert(
      products.map((p) => ({ store_id: store.id, product_id: p.id, stock: 0 })),
      { onConflict: "store_id,product_id" }
    );
  }

  revalidateManagement();
  return { success: true, storeId: store.id };
}

export async function addStock(
  productId: string,
  quantity: number,
  storeId: string,
  notes?: string
) {
  const profile = await requireRole([...STOCK_MODIFY]);
  if (!profile) return { error: "Non autorisé" };

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: "La quantité doit être un nombre positif (minimum 1)" };
  }
  if (!storeId) return { error: "Veuillez sélectionner un magasin" };

  const access = await assertStockModifyAccess(profile, storeId);
  if (access.error) return { error: access.error };

  const supabase = await createClient();

  const { data: row } = await supabase
    .from("store_inventory")
    .select("stock")
    .eq("store_id", storeId)
    .eq("product_id", productId)
    .maybeSingle();

  const currentStock = row?.stock ?? 0;

  const { error: upsertError } = await supabase.from("store_inventory").upsert(
    { store_id: storeId, product_id: productId, stock: currentStock + quantity },
    { onConflict: "store_id,product_id" }
  );

  if (upsertError) return { error: upsertError.message };

  await supabase.from("stock_movements").insert({
    product_id: productId,
    quantity,
    type: "add",
    notes: notes || null,
    created_by: profile.id,
    store_id: storeId,
    access_request_id: movementAccessRequestId(access),
  });

  revalidateManagement();
  return { success: true };
}

/** Référence un produit au magasin avec un stock absolu (0 autorisé). */
export async function registerStoreProductStock(
  productId: string,
  storeId: string,
  stock: number,
  notes?: string
) {
  const profile = await requireRole([...STOCK_MODIFY]);
  if (!profile) return { error: "Non autorisé" };

  if (!Number.isFinite(stock) || stock < 0) {
    return { error: "Le stock ne peut pas être négatif" };
  }
  if (!storeId) return { error: "Veuillez sélectionner un magasin" };

  const access = await assertStockModifyAccess(profile, storeId);
  if (access.error) return { error: access.error };

  const supabase = await createClient();

  const { data: row } = await supabase
    .from("store_inventory")
    .select("stock")
    .eq("store_id", storeId)
    .eq("product_id", productId)
    .maybeSingle();

  const currentStock = row?.stock ?? 0;
  const diff = stock - currentStock;

  const { error: upsertError } = await supabase.from("store_inventory").upsert(
    { store_id: storeId, product_id: productId, stock },
    { onConflict: "store_id,product_id" }
  );

  if (upsertError) return { error: upsertError.message };

  if (diff !== 0) {
    await supabase.from("stock_movements").insert({
      product_id: productId,
      quantity: diff,
      type: diff > 0 ? "add" : "adjustment",
      notes: notes || null,
      created_by: profile.id,
      store_id: storeId,
      access_request_id: movementAccessRequestId(access),
    });
  }

  revalidateManagement();
  return { success: true };
}

export async function setProductStock(
  productId: string,
  stock: number,
  storeId: string
) {
  const profile = await requireRole([...STOCK_MODIFY]);
  if (!profile) return { error: "Non autorisé" };

  if (stock < 0) return { error: "Le stock ne peut pas être négatif" };
  if (!storeId) return { error: "Veuillez sélectionner un magasin" };

  const access = await assertStockModifyAccess(profile, storeId);
  if (access.error) return { error: access.error };

  if (isHub(profile) && !("grant" in access && access.grant)) {
    return { error: "Demandez un accès temporaire au directeur pour modifier le stock total" };
  }
  if (isManager(profile) && !("grant" in access && access.grant)) {
    return { error: "Demandez un accès temporaire au directeur pour modifier le stock" };
  }

  const supabase = await createClient();

  const { data: row } = await supabase
    .from("store_inventory")
    .select("stock")
    .eq("store_id", storeId)
    .eq("product_id", productId)
    .maybeSingle();

  const currentStock = row?.stock ?? 0;
  const diff = stock - currentStock;

  const { error: upsertError } = await supabase.from("store_inventory").upsert(
    { store_id: storeId, product_id: productId, stock },
    { onConflict: "store_id,product_id" }
  );

  if (upsertError) return { error: upsertError.message };

  if (diff !== 0) {
    await supabase.from("stock_movements").insert({
      product_id: productId,
      quantity: diff,
      type: "adjustment",
      notes: "Ajustement manuel",
      created_by: profile.id,
      store_id: storeId,
      access_request_id: movementAccessRequestId(access),
    });
  }

  revalidateManagement();
  return { success: true };
}

export type HubStockTransferItem = {
  productId: string;
  quantity: number;
};

export async function transferHubStock(
  toStoreId: string,
  items: HubStockTransferItem[],
  notes?: string
): Promise<{ success: true; storeName: string } | { error: string }> {
  const profile = await requireRole(["hub"]);
  if (!profile?.city) return { error: "Non autorisé" };

  if (!toStoreId) return { error: "Sélectionnez un magasin destination" };

  const cleaned = items
    .map((item) => ({
      product_id: item.productId,
      quantity: Math.floor(item.quantity),
    }))
    .filter((item) => item.product_id && item.quantity > 0);

  if (cleaned.length === 0) {
    return { error: "Indiquez au moins une quantité à transférer" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("transfer_hub_stock", {
    p_to_store_id: toStoreId,
    p_items: cleaned,
    p_notes: notes?.trim() || null,
  });

  if (error) {
    const msg = error.message;
    if (msg.includes("Stock insuffisant")) {
      return { error: "Stock insuffisant à l'entrepôt pour un ou plusieurs produits" };
    }
    if (msg.includes("Magasin destination non autorisé")) {
      return { error: "Ce magasin n'est pas rattaché à votre dépôt" };
    }
    if (msg.includes("destination invalide")) {
      return { error: "Magasin destination non autorisé" };
    }
    return { error: msg };
  }

  revalidateManagement();
  const storeName =
    typeof data === "object" && data !== null && "store" in data
      ? String((data as { store?: string }).store || "")
      : "";

  return { success: true, storeName };
}

export async function transferStoreStock(
  fromStoreId: string,
  toStoreId: string,
  items: HubStockTransferItem[],
  notes?: string
): Promise<
  { success: true; transferId: string; toStoreName: string } | { error: string }
> {
  const profile = await requireRole(["directeur", "admin", "manager"]);
  if (!profile) return { error: "Non autorisé" };

  if (!fromStoreId || !toStoreId) {
    return { error: "Sélectionnez les magasins source et destination" };
  }

  const access = await assertStoreTransferAccess(profile, fromStoreId, toStoreId);
  if ("error" in access && access.error) return { error: access.error };

  const cleaned = items
    .map((item) => ({
      product_id: item.productId,
      quantity: Math.floor(item.quantity),
    }))
    .filter((item) => item.product_id && item.quantity > 0);

  if (cleaned.length === 0) {
    return { error: "Indiquez au moins une quantité à transférer" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_store_stock_transfer", {
    p_from_store_id: fromStoreId,
    p_to_store_id: toStoreId,
    p_items: cleaned,
    p_notes: notes?.trim() || null,
  });

  if (error) {
    const msg = error.message;
    if (msg.includes("Stock insuffisant")) {
      return { error: "Stock insuffisant au magasin source pour un ou plusieurs produits" };
    }
    if (msg.includes("hors périmètre") || msg.includes("invalide")) {
      return { error: "Magasin non autorisé pour ce transfert" };
    }
    return { error: msg };
  }

  revalidateManagement();

  const payload =
    typeof data === "object" && data !== null
      ? (data as { transfer_id?: string; to_store?: string })
      : {};

  return {
    success: true,
    transferId: String(payload.transfer_id || ""),
    toStoreName: String(payload.to_store || access.toStore?.name || ""),
  };
}

export async function markStoreTransferReady(
  transferId: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["directeur", "admin", "manager", "cashier"]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_store_transfer_ready", {
    p_transfer_id: transferId,
  });
  if (error) return { error: error.message };

  revalidateManagement();
  return { success: true };
}

export async function assignStoreTransferLivreur(
  transferId: string,
  livreurId: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["directeur", "admin", "manager", "cashier"]);
  if (!profile) return { error: "Non autorisé" };
  if (!livreurId) return { error: "Sélectionnez un livreur" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_store_transfer_livreur", {
    p_transfer_id: transferId,
    p_livreur_id: livreurId,
  });
  if (error) return { error: error.message };

  revalidateManagement();
  return { success: true };
}

export async function shipStoreStockTransfer(
  transferId: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["directeur", "admin", "manager", "cashier", "livreur"]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("ship_store_stock_transfer", {
    p_transfer_id: transferId,
  });
  if (error) {
    if (error.message.includes("Stock insuffisant")) {
      return { error: "Stock insuffisant au magasin source" };
    }
    if (error.message.includes("livreur")) {
      return { error: error.message };
    }
    return { error: error.message };
  }

  revalidateManagement();
  return { success: true };
}

export async function deliverStoreStockTransfer(
  transferId: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["livreur"]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("deliver_store_stock_transfer", {
    p_transfer_id: transferId,
  });
  if (error) return { error: error.message };

  revalidateManagement();
  return { success: true };
}

export async function markStoreTransferDelivered(
  transferId: string
): Promise<{ success: true } | { error: string }> {
  return deliverStoreStockTransfer(transferId);
}

export async function confirmStoreStockTransfer(
  transferId: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["directeur", "admin", "manager", "cashier"]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_store_stock_transfer", {
    p_transfer_id: transferId,
  });
  if (error) return { error: error.message };

  revalidateManagement();
  return { success: true };
}

export async function confirmHubStockTransfer(
  transferId: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["cashier", "manager", "directeur", "admin", "hub"]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { data: transfer, error: loadError } = await supabase
    .from("hub_stock_transfers")
    .select("id, status, to_store_id, items:hub_stock_transfer_items(id)")
    .eq("id", transferId)
    .maybeSingle();

  if (loadError || !transfer) {
    return { error: "Transfert introuvable" };
  }

  if (transfer.status !== "livre" && transfer.status !== "sent") {
    return { error: "Le livreur doit d'abord marquer la commande comme livrée" };
  }

  if (profile.role === "cashier" && profile.store_id !== transfer.to_store_id) {
    return { error: "Ce transfert ne concerne pas votre magasin" };
  }

  const itemCount = Array.isArray(transfer.items) ? transfer.items.length : 0;
  if (itemCount === 0) {
    return { error: "Ce transfert ne contient aucun produit — contactez le hub" };
  }

  const { data, error } = await supabase.rpc("confirm_hub_stock_transfer", {
    p_transfer_id: transferId,
  });

  if (error) {
    const msg = error.message;
    if (msg.includes("déjà été traité")) {
      return { error: "Ce transfert a déjà été reçu" };
    }
    if (msg.includes("votre magasin")) {
      return { error: "Ce transfert ne concerne pas votre magasin" };
    }
    if (msg.includes("sans articles")) {
      return { error: "Ce transfert ne contient aucun produit — contactez le hub" };
    }
    return { error: msg };
  }

  const credited =
    typeof data === "object" &&
    data !== null &&
    "items_credited" in data &&
    typeof (data as { items_credited?: unknown }).items_credited === "number"
      ? (data as { items_credited: number }).items_credited
      : itemCount;

  if (credited === 0) {
    return { error: "Aucun stock n'a été crédité — contactez le support" };
  }

  revalidateManagement();
  return { success: true };
}

export async function repairHubStockTransfer(
  transferId: string
): Promise<{ success: true; credited: number } | { error: string }> {
  const profile = await requireRole(["manager", "directeur", "admin", "hub"]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("repair_hub_transfer_stock", {
    p_transfer_id: transferId,
  });

  if (error) {
    return { error: error.message };
  }

  const credited =
    typeof data === "object" &&
    data !== null &&
    "items_credited" in data &&
    typeof (data as { items_credited?: unknown }).items_credited === "number"
      ? (data as { items_credited: number }).items_credited
      : 0;

  revalidateManagement();
  return { success: true, credited };
}

export async function deliverHubTransfer(
  transferId: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["livreur"]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("deliver_hub_transfer", {
    p_transfer_id: transferId,
  });

  if (error) return { error: error.message };

  revalidateManagement();
  return { success: true };
}

export async function markHubTransferReady(
  transferId: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["hub"]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_hub_transfer_ready", {
    p_transfer_id: transferId,
  });

  if (error) return { error: error.message };

  revalidateManagement();
  return { success: true };
}

export async function assignHubTransferLivreur(
  transferId: string,
  livreurId: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["hub"]);
  if (!profile) return { error: "Non autorisé" };

  if (!livreurId) return { error: "Sélectionnez un livreur" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_hub_transfer_livreur", {
    p_transfer_id: transferId,
    p_livreur_id: livreurId,
  });

  if (error) return { error: error.message };

  revalidateManagement();
  return { success: true };
}

export async function pickupHubTransfer(
  transferId: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["hub", "livreur"]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("pickup_hub_transfer", {
    p_transfer_id: transferId,
  });

  if (error) {
    const msg = error.message;
    if (msg.includes("Stock insuffisant")) {
      return { error: "Stock insuffisant à l'entrepôt pour un ou plusieurs produits" };
    }
    return { error: msg };
  }

  revalidateManagement();
  return { success: true };
}

export async function getProductStoreStock(productId: string, storeId: string) {
  const profile = await requireRole([...STOCK_READ]);
  if (!profile) return { error: "Non autorisé", stock: 0 };

  const access = await assertStoreAccess(profile, storeId);
  if (access.error) return { error: access.error, stock: 0 };

  const supabase = await createClient();
  const { data } = await supabase
    .from("store_inventory")
    .select("stock")
    .eq("store_id", storeId)
    .eq("product_id", productId)
    .maybeSingle();

  return { stock: data?.stock ?? 0 };
}

export async function updateUserRole(userId: string, role: "manager" | "cashier") {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) return { error: "Non autorisé" };

  if (userId === profile.id) return { error: "Vous ne pouvez pas modifier votre propre rôle" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidateManagement();
  return { success: true };
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  const profile = await requireRole([...MANAGEMENT]);
  if (!profile) return { error: "Non autorisé" };

  if (userId === profile.id) return { error: "Vous ne pouvez pas désactiver votre propre compte" };

  const supabase = await createClient();
  const { data: target, error: targetError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (targetError || !target) return { error: "Utilisateur introuvable" };
  if (target.role === "directeur" || target.role === "admin") {
    return { error: "Impossible de modifier ce compte" };
  }
  if (!isDirector(profile) && target.role === "manager") {
    return { error: "Seul le directeur peut modifier un gérant" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidateManagement();
  return { success: true };
}

export async function deleteUser(userId: string) {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) return { error: "Non autorisé" };

  if (userId === profile.id) {
    return { error: "Vous ne pouvez pas supprimer votre propre compte" };
  }

  const supabase = await createClient();
  const { data: target, error: targetError } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", userId)
    .maybeSingle();

  if (targetError || !target) return { error: "Utilisateur introuvable" };
  if (target.role === "directeur" || target.role === "admin") {
    return { error: "Impossible de supprimer ce compte" };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);

  if (error) {
    const message = error.message.toLowerCase();
    if (
      message.includes("foreign key") ||
      message.includes("violates") ||
      message.includes("constraint")
    ) {
      return {
        error:
          "Suppression impossible : cet utilisateur a de l'historique (ventes, planning…). Désactivez-le à la place.",
      };
    }
    return { error: error.message };
  }

  revalidateManagement();
  return { success: true };
}

export async function completeSale(
  items: { product_id: string; quantity: number }[],
  paymentMethod: PaymentMethod = "cash",
  storeId?: string,
  loyalty?: { customerId: string; pointsToRedeem?: number },
  promoCode?: string | null,
  chequeDetails?: import("@/lib/sales/cheques/types").SaleChequeDetails
) {
  const profile = await requireRole([...MANAGEMENT, "cashier"]);
  if (!profile) return { error: "Non autorisé" };

  if (items.length === 0) return { error: "Panier vide" };

  const { requirePosOperatorId } = await import("@/lib/pos/operator-session");
  const operator = await requirePosOperatorId(profile);
  if (operator.error) return { error: operator.error };

  if (storeId && profile.role !== "cashier") {
    const access = await assertStoreAccess(profile, storeId);
    if (access.error) return { error: access.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_sale", {
    p_items: items,
    p_payment_method: paymentMethod,
    p_store_id: storeId || null,
    p_customer_id: loyalty?.customerId || null,
    p_points_to_redeem: loyalty?.pointsToRedeem || 0,
    p_promo_code: promoCode?.trim() || null,
    p_operator_id: operator.operatorId,
  });

  if (error) return { error: error.message };

  const saleId = data as string;

  if (paymentMethod === "cheque") {
    if (!chequeDetails?.bankName?.trim() || !chequeDetails.chequeNumber?.trim()) {
      return { error: "Informations chèque incomplètes" };
    }

    const { data: saleRow, error: saleFetchError } = await supabase
      .from("sales")
      .select("store_id, total")
      .eq("id", saleId)
      .single();

    if (saleFetchError || !saleRow?.store_id) {
      return { error: "Vente enregistrée mais magasin introuvable pour le chèque" };
    }

    if (chequeDetails.chequeAmount < Number(saleRow.total)) {
      return { error: "Le montant du chèque est inférieur au total de la vente" };
    }

    const { error: chequeError } = await supabase.from("sale_cheques").insert({
      sale_id: saleId,
      store_id: saleRow.store_id,
      bank_name: chequeDetails.bankName.trim(),
      cheque_number: chequeDetails.chequeNumber.trim(),
      cheque_amount: chequeDetails.chequeAmount,
      drawer_name: chequeDetails.drawerName?.trim() || null,
      issue_date: chequeDetails.issueDate || null,
      notes: chequeDetails.notes?.trim() || null,
      created_by: profile.id,
    });

    if (chequeError) {
      console.error("completeSale cheque:", chequeError.message);
      return { error: `Vente OK mais chèque non enregistré : ${chequeError.message}` };
    }
  }

  try {
    const { sendSaleWhatsAppNotification } = await import(
      "@/lib/kapso/sale-notification"
    );
    await sendSaleWhatsAppNotification(saleId);
  } catch (whatsappError) {
    console.error("completeSale WhatsApp:", whatsappError);
  }

  try {
    const { sendPosServiceFeedback } = await import(
      "@/lib/kapso/feedback/delivery-cron"
    );
    await sendPosServiceFeedback(saleId);
  } catch (feedbackError) {
    console.error("completeSale feedback WhatsApp:", feedbackError);
  }

  try {
    const { sendCrossSellForSale } = await import("@/lib/marketing/send-marketing");
    await sendCrossSellForSale(saleId);
  } catch (crossSellError) {
    console.error("completeSale cross-sell WhatsApp:", crossSellError);
  }

  revalidatePath("/cashier/pos");
  revalidatePath("/cashier/sales");
  revalidatePath("/manager/sales");
  revalidatePath("/manager");
  revalidatePath("/manager/loyalty");
  revalidatePath("/director/sales");
  revalidatePath("/director");
  revalidatePath("/director/loyalty");
  revalidatePath("/cashier/cheques");
  revalidatePath("/manager/cheques");
  revalidatePath("/director/cheques");
  return { success: true, saleId: data as string };
}

export async function cancelSale(
  saleId: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole([...MANAGEMENT, "cashier"]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_sale", { p_sale_id: saleId });

  if (error) return { error: error.message };

  revalidatePath("/cashier/sales");
  revalidatePath("/cashier/pos");
  revalidatePath("/manager/sales");
  revalidatePath("/director/sales");
  revalidatePath("/manager/stock");
  revalidatePath("/director/stock");

  return { success: true };
}

function revalidateInvoicePaths() {
  revalidatePath("/cashier/invoices");
  revalidatePath("/manager/invoices");
  revalidatePath("/director/invoices");
  revalidatePath("/hub/invoices");
}

export async function validateSaleInvoice(
  saleId: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["directeur"]);
  if (!profile) return { error: "Seul le directeur peut valider une facture" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("validate_sale_invoice", { p_sale_id: saleId });

  if (error) return { error: error.message };

  revalidateInvoicePaths();
  revalidatePath(`/director/invoices/${saleId}`);
  revalidatePath("/cashier/sales");
  revalidatePath("/manager/sales");
  revalidatePath("/director/sales");

  return { success: true };
}

export async function createLoyaltyCustomer(input: {
  fullName: string;
  phone: string;
  email?: string;
  storeId?: string;
  cardVariant?: import("@/lib/types").LoyaltyCardVariant;
}): Promise<{ success: true; customer: import("@/lib/types").LoyaltyCustomer } | { error: string }> {
  const profile = await requireRole([...MANAGEMENT, "cashier"]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_loyalty_customer", {
    p_full_name: input.fullName.trim(),
    p_phone: input.phone.trim(),
    p_email: input.email?.trim() || null,
    p_store_id: input.storeId || profile.store_id || null,
    p_card_variant: input.cardVariant ?? "champagne",
  });

  if (error) {
    if (error.message.includes("Modèle de carte invalide")) {
      return {
        error:
          "Le modèle Crème n'est pas encore activé sur la base de données. Exécutez : npx supabase db push",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/cashier/pos");
  revalidatePath("/cashier/customers");
  revalidatePath("/cashier/pro-clients");
  revalidatePath("/manager/loyalty");
  revalidatePath("/director/loyalty");
  return { success: true, customer: data as import("@/lib/types").LoyaltyCustomer };
}

export async function updateLoyaltySettings(input: {
  pointsPerMad: number;
  pointValueMad: number;
  minPointsToRedeem: number;
}): Promise<{ success: true; settings: import("@/lib/types").LoyaltySettings } | { error: string }> {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) return { error: "Non autorisé" };

  const pointsPerMad = Number(input.pointsPerMad);
  const pointValueMad = Number(input.pointValueMad);
  const minPointsToRedeem = Math.floor(Number(input.minPointsToRedeem));

  if (!Number.isFinite(pointsPerMad) || pointsPerMad <= 0) {
    return { error: "Le montant MAD par point doit être supérieur à 0" };
  }
  if (!Number.isFinite(pointValueMad) || pointValueMad <= 0) {
    return { error: "La valeur du point doit être supérieure à 0" };
  }
  if (!Number.isFinite(minPointsToRedeem) || minPointsToRedeem < 0) {
    return { error: "Le minimum de points est invalide" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_loyalty_settings", {
    p_points_per_mad: pointsPerMad,
    p_point_value_mad: pointValueMad,
    p_min_points_to_redeem: minPointsToRedeem,
  });

  if (error) return { error: error.message };

  const { mapLoyaltySettings } = await import("@/lib/loyalty/settings");
  const settings = mapLoyaltySettings(
    data as {
      points_per_mad: number;
      point_value_mad: number;
      min_points_to_redeem: number;
    }
  );

  revalidatePath("/director/loyalty");
  revalidatePath("/cashier/pos");
  revalidatePath("/carte", "layout");
  return { success: true, settings };
}

export async function fetchLoyaltyCustomerNotes(
  customerId: string
): Promise<{ notes: import("@/lib/types").CustomerNote[] } | { error: string }> {
  const profile = await requireRole([...MANAGEMENT, "cashier"]);
  if (!profile) return { error: "Non autorisé" };

  const { getCustomerNotes } = await import("@/lib/loyalty/customer-notes");
  const supabase = await createClient();
  const notes = await getCustomerNotes(supabase, customerId, 8);
  return { notes };
}

export async function lookupLoyaltyCustomerByPhone(
  phone: string
): Promise<LoyaltyLookupResult> {
  const profile = await requireRole([...MANAGEMENT, "cashier"]);
  if (!profile) return { error: "Non autorisé" };

  const { getCustomerByPhone } = await import("@/lib/loyalty/customers");
  const { getCustomerNotes } = await import("@/lib/loyalty/customer-notes");
  const supabase = await createClient();
  const customer = await getCustomerByPhone(supabase, phone);
  if (!customer) return { error: "Client introuvable" };
  const notes = await getCustomerNotes(supabase, customer.id, 8);
  return resolveLoyaltyLookupResult(customer, notes);
}

/** Téléphone, code-barres carte (FID-…) ou QR code (NATUS:LOYALTY:…) */
export async function lookupLoyaltyCustomer(raw: string): Promise<LoyaltyLookupResult> {
  const profile = await requireRole([...MANAGEMENT, "cashier"]);
  if (!profile) return { error: "Non autorisé" };

  const trimmed = raw.trim();
  if (!trimmed) return { error: "Saisie vide" };

  const { parseLoyaltyQrPayload } = await import("@/lib/loyalty/qr");
  const scanPayload = parseLoyaltyQrPayload(trimmed);
  if (scanPayload) {
    const { getCustomerByCardOrToken } = await import("@/lib/loyalty/customers");
    const { getCustomerNotes } = await import("@/lib/loyalty/customer-notes");
    const supabase = await createClient();
    const customer = await getCustomerByCardOrToken(supabase, scanPayload);
    if (!customer) return { error: "Carte introuvable" };
    const notes = await getCustomerNotes(supabase, customer.id, 8);
    return resolveLoyaltyLookupResult(customer, notes);
  }

  const { normalizePhone } = await import("@/lib/loyalty/phone");
  if (!normalizePhone(trimmed)) {
    return { error: "Téléphone, code-barres ou QR code invalide" };
  }

  return lookupLoyaltyCustomerByPhone(trimmed);
}

export async function validatePosPromoCode(
  code: string,
  storeId?: string,
  customerId?: string
): Promise<
  | {
      promo: import("@/lib/marketing/pos-promo").AppliedPosPromo;
    }
  | { error: string }
> {
  const profile = await requireRole([...MANAGEMENT, "cashier"]);
  if (!profile) return { error: "Non autorisé" };

  const trimmed = code.trim();
  if (!trimmed) return { error: "Code promo vide" };

  const supabase = await createClient();
  let resolvedStoreId = storeId || profile.store_id;

  if (!resolvedStoreId && profile.role !== "cashier") {
    const { data: store } = await supabase
      .from("stores")
      .select("id")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    resolvedStoreId = store?.id ?? null;
  }

  if (!resolvedStoreId) {
    return { error: "Magasin non configuré pour valider le code promo" };
  }

  const { data, error } = await supabase.rpc("validate_pos_promo_code", {
    p_code: trimmed,
    p_store_id: resolvedStoreId,
    p_customer_id: customerId || null,
  });

  if (error) return { error: error.message };

  const row = (data as Array<{
    normalized_code: string;
    promo_label: string;
    discount_percent: number;
    is_winback: boolean;
  }> | null)?.[0];

  if (!row) return { error: "Code promo invalide" };

  return {
    promo: {
      code: row.normalized_code,
      label: row.promo_label,
      discountPercent: Number(row.discount_percent),
      isWinback: row.is_winback,
    },
  };
}

export async function lookupLoyaltyCustomerByScan(raw: string): Promise<LoyaltyLookupResult> {
  const profile = await requireRole([...MANAGEMENT, "cashier"]);
  if (!profile) return { error: "Non autorisé" };

  const { parseLoyaltyQrPayload } = await import("@/lib/loyalty/qr");
  const { getCustomerByCardOrToken } = await import("@/lib/loyalty/customers");
  const { getCustomerNotes } = await import("@/lib/loyalty/customer-notes");
  const identifier = parseLoyaltyQrPayload(raw);
  if (!identifier) return { error: "Carte invalide (QR ou FID-…)" };

  const supabase = await createClient();
  const customer = await getCustomerByCardOrToken(supabase, identifier);
  if (!customer) return { error: "Carte introuvable" };
  const notes = await getCustomerNotes(supabase, customer.id, 8);
  return resolveLoyaltyLookupResult(customer, notes);
}

export async function completeShopifyOrderSale(
  shopifyOrderId: string,
  items: { product_id: string; quantity: number }[],
  _paymentMethod: PaymentMethod = "cash",
  storeId?: string
) {
  const profile = await requireRole(["directeur", "manager", "cashier"]);
  if (!profile) return { error: "Non autorisé" };

  const { getShopifyOrderById, canAccessShopifyOrder } = await import(
    "@/lib/shopify/order-access"
  );
  const order = await getShopifyOrderById(shopifyOrderId);
  if (!order) return { error: "Commande introuvable" };

  if (!(await canAccessShopifyOrder(profile, order))) {
    return { error: "Accès refusé" };
  }

  const { requirePosOperatorId, getEffectiveCashierId } = await import(
    "@/lib/pos/operator-session"
  );
  const operator = await requirePosOperatorId(profile);
  if (operator.error) return { error: operator.error };
  const effective = await getEffectiveCashierId(profile);
  if (effective.error) return { error: effective.error };

  if (order.fulfilled_at) {
    return { error: "Commande déjà préparée en caisse" };
  }

  if (order.sale_id && order.payment_type !== "cod") {
    return { error: "Commande déjà préparée en caisse" };
  }

  const supabase = await createClient();
  const { data: saleId, error: fulfillError } = await supabase.rpc(
    "fulfill_shopify_order_sale",
    {
      p_shopify_order_id: shopifyOrderId,
      p_items: items,
      p_store_id: storeId || order.store_id || null,
      p_payment_method: _paymentMethod,
      p_operator_id: operator.operatorId,
    }
  );

  if (fulfillError) return { error: fulfillError.message };

  const isCod = order.payment_type === "cod";
  if (!isCod && !saleId) {
    return { error: "Erreur création facture commande" };
  }

  const now = new Date().toISOString();

  const { resolveLivreurForReadyOrder } = await import("@/lib/shopify/assign-livreur");
  const livreurId = order.store_id
    ? await resolveLivreurForReadyOrder(order.store_id)
    : null;

  const updates: Record<string, unknown> = {
    fulfilled_at: now,
    fulfilled_by: effective.cashierId,
    workflow_status: "ready",
    updated_at: now,
  };
  if (livreurId) {
    updates.assigned_livreur_id = livreurId;
  }

  const { error: updateError } = await supabase
    .from("shopify_orders")
    .update(updates)
    .eq("id", shopifyOrderId);

  if (updateError) {
    return { error: updateError.message };
  }

  const { syncShopifyWorkflowStatus } = await import("@/lib/shopify/update-order");
  await syncShopifyWorkflowStatus(order.shopify_order_id, "ready");

  revalidatePath("/cashier/orders");
  revalidatePath("/cashier/sales");
  revalidatePath("/manager/orders");
  revalidatePath("/director/orders");
  revalidatePath("/director/hub");
  revalidatePath("/livreur/orders");

  return { success: true, saleId: (saleId as string | null) ?? undefined };
}

export async function prepareShopifyOrderForPos(
  orderId: string
): Promise<{ success: true; status: import("@/lib/types").ShopifyWorkflowStatus } | { error: string }> {
  const profile = await requireRole(["directeur", "manager", "cashier"]);
  if (!profile) return { error: "Non autorisé" };

  const { getShopifyOrderById } = await import("@/lib/shopify/order-access");
  const order = await getShopifyOrderById(orderId);
  if (!order) return { error: "Commande introuvable" };
  if (order.fulfilled_at || order.sale_id) {
    return { error: "Commande déjà préparée en caisse" };
  }

  const { applyShopifyOrderWorkflowStatus } = await import(
    "@/lib/shopify/set-workflow-status"
  );
  const result = await applyShopifyOrderWorkflowStatus(orderId, "preparing", profile);
  if ("error" in result) return result;

  revalidatePath("/cashier/orders");
  revalidatePath("/manager/orders");
  revalidatePath("/director/orders");
  revalidatePath("/director/hub");
  revalidatePath("/livreur/orders");

  return { success: true, status: result.status };
}

export async function updateUserStore(userId: string, storeId: string | null) {
  const profile = await requireRole([...MANAGEMENT]);
  if (!profile) return { error: "Non autorisé" };

  if (storeId) {
    const access = await assertStoreAccess(profile, storeId);
    if (access.error) return { error: access.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ store_id: storeId })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidateManagement();
  return { success: true };
}

export async function createUser(formData: FormData) {
  const profile = await requireRole([...MANAGEMENT]);
  if (!profile) return { error: "Non autorisé" };

  const email = normalizeUserEmail((formData.get("email") as string) || "");
  const password = formData.get("password") as string;
  const fullName = ((formData.get("full_name") as string) || "").trim();
  const role = formData.get("role") as "manager" | "cashier" | "livreur" | "hub";
  const city = ((formData.get("city") as string) || "").trim() || null;
  const storeId = (formData.get("store_id") as string) || null;
  const isStorePos = formData.get("is_store_pos") === "on";
  const limitToStore = formData.get("limit_to_store") === "on";
  const useCustomPages = formData.get("use_custom_pages") === "on";
  const allowedPagesRaw = parseAllowedPagesInput(formData.get("allowed_pages"));
  const allowedPages = useCustomPages
    ? validateAllowedPagesForRole(role, allowedPagesRaw)
    : null;

  if (useCustomPages && !isDirector(profile)) {
    return { error: "Seul le directeur peut personnaliser les pages visibles" };
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Adresse email invalide" };
  }
  if (!password || password.length < 6) {
    return { error: "Le mot de passe doit contenir au moins 6 caractères" };
  }
  if (!fullName) {
    return { error: "Le nom est requis" };
  }

  if (!canCreateRole(profile, role)) {
    return { error: "Vous n'êtes pas autorisé à créer ce type de compte" };
  }

  if (role === "manager" || role === "hub") {
    if (role === "manager" && limitToStore) {
      if (!storeId) return { error: "Magasin requis pour un gérant limité à un point de vente" };
      const store = await getStoreById(storeId);
      if (!store) return { error: "Magasin introuvable" };
      if (!canManageStore(profile, store)) {
        return { error: "Ce magasin n'est pas dans votre périmètre" };
      }
    } else if (!city) {
      return { error: role === "hub" ? "Ville requise pour le dépôt" : "Ville requise pour le gérant" };
    } else if (!canCreateStoreInCity(profile, city)) {
      return { error: "Vous ne pouvez créer ce compte que pour votre ville" };
    }
  }

  const hubStoreIds =
    role === "hub"
      ? [...new Set(formData.getAll("hub_store_ids").map(String).filter(Boolean))]
      : [];

  if (role === "hub") {
    if (hubStoreIds.length === 0) {
      return { error: "Sélectionnez au moins un magasin rattaché au dépôt" };
    }
    for (const storeId of hubStoreIds) {
      const store = await getStoreById(storeId);
      if (!store || store.is_hub || !store.is_active) {
        return { error: "Magasin retail invalide pour ce dépôt" };
      }
    }
  }

  if (role === "cashier") {
    if (!storeId) {
      return { error: "Magasin requis pour le caissier" };
    }
    const store = await getStoreById(storeId);
    if (!store) return { error: "Magasin introuvable" };
    if (!canManageStore(profile, store)) {
      return { error: "Ce magasin n'est pas dans votre périmètre" };
    }
    const supabaseCheck = await createClient();
    const { data: existingPos } = await supabaseCheck
      .from("profiles")
      .select("id")
      .eq("role", "cashier")
      .eq("store_id", storeId)
      .eq("is_store_pos", true)
      .eq("is_active", true)
      .maybeSingle();
    if (existingPos) {
      return { error: "Ce magasin a déjà un compte caisse partagé actif" };
    }
  }

  if (role === "livreur") {
    if (!city) {
      return { error: "Ville requise pour le livreur" };
    }
    if (!canCreateStoreInCity(profile, city)) {
      return { error: "Vous ne pouvez créer ce livreur que pour votre ville" };
    }
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
      city: role === "manager" || role === "hub" || role === "livreur" ? city : undefined,
    },
    app_metadata: { provider: "email", providers: ["email"] },
  });

  if (error) return { error: mapCreateUserAuthError(error.message) };

  if (data.user) {
    const updates: Record<string, unknown> = {
      full_name: fullName,
      role,
      is_active: true,
    };

    if (role === "manager" || role === "hub") {
      if (role === "manager" && limitToStore && storeId) {
        const store = await getStoreById(storeId);
        updates.store_id = storeId;
        updates.city = store?.city || null;
      } else {
        updates.city = city;
        updates.store_id = null;
      }
    }

    if (role === "cashier" && storeId) {
      updates.store_id = storeId;
      const store = await getStoreById(storeId);
      updates.city = store?.city || null;
      updates.is_store_pos = true;
    }

    if (role === "livreur") {
      updates.city = city;
      updates.store_id = null;
    }

    updates.access_preset = "full";
    updates.allowed_pages = allowedPages;

    await admin.from("profiles").update(updates).eq("id", data.user.id);

    if (role === "hub" && city) {
      const assignResult = await saveHubStoreAssignments(admin, data.user.id, hubStoreIds);
      if ("error" in assignResult && assignResult.error) return { error: assignResult.error };
    }
  }

  revalidateManagement();
  revalidatePath("/director/hubs");
  return { success: true };
}

export async function updateUser(formData: FormData) {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) return { error: "Non autorisé" };

  const userId = (formData.get("user_id") as string) || "";
  const email = normalizeUserEmail((formData.get("email") as string) || "");
  const password = ((formData.get("password") as string) || "").trim();
  const fullName = ((formData.get("full_name") as string) || "").trim();
  const city = ((formData.get("city") as string) || "").trim() || null;
  const storeId = (formData.get("store_id") as string) || null;
  const limitToStore = formData.get("limit_to_store") === "on";
  const useCustomPages = formData.get("use_custom_pages") === "on";
  const allowedPagesRaw = parseAllowedPagesInput(formData.get("allowed_pages"));

  if (!userId) return { error: "Utilisateur introuvable" };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Adresse email invalide" };
  }
  if (!fullName) return { error: "Le nom est requis" };
  if (password && password.length < 6) {
    return { error: "Le mot de passe doit contenir au moins 6 caractères" };
  }

  const supabase = await createClient();
  const { data: target, error: targetError } = await supabase
    .from("profiles")
    .select("id, role, email, store_id, is_store_pos")
    .eq("id", userId)
    .maybeSingle();

  if (targetError || !target) return { error: "Utilisateur introuvable" };
  if (target.role === "directeur" || target.role === "admin") {
    return { error: "Impossible de modifier ce compte" };
  }

  const role = target.role as Profile["role"];
  const allowedPages = useCustomPages
    ? validateAllowedPagesForRole(role, allowedPagesRaw)
    : null;

  if (useCustomPages && !allowedPages?.length) {
    return { error: "Sélectionnez au moins une page" };
  }

  if (role === "manager") {
    if (limitToStore) {
      if (!storeId) return { error: "Magasin requis pour un gérant limité à un point de vente" };
      const store = await getStoreById(storeId);
      if (!store) return { error: "Magasin introuvable" };
      if (!canManageStore(profile, store)) {
        return { error: "Ce magasin n'est pas dans votre périmètre" };
      }
    } else if (!city) {
      return { error: "Ville requise pour le gérant" };
    } else if (!canCreateStoreInCity(profile, city)) {
      return { error: "Vous ne pouvez modifier ce compte que pour votre ville" };
    }
  }

  if (role === "cashier") {
    if (!storeId) {
      return { error: "Magasin requis pour le caissier" };
    }
    const store = await getStoreById(storeId);
    if (!store) return { error: "Magasin introuvable" };
    if (!canManageStore(profile, store)) {
      return { error: "Ce magasin n'est pas dans votre périmètre" };
    }
    if (target.is_store_pos && storeId !== target.store_id) {
      const { data: existingPos } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "cashier")
        .eq("store_id", storeId)
        .eq("is_store_pos", true)
        .eq("is_active", true)
        .neq("id", userId)
        .maybeSingle();
      if (existingPos) {
        return { error: "Ce magasin a déjà un compte caisse partagé actif" };
      }
    }
  }

  if (role === "livreur") {
    if (!city) {
      return { error: "Ville requise pour le livreur" };
    }
    if (!canCreateStoreInCity(profile, city)) {
      return { error: "Vous ne pouvez modifier ce livreur que pour votre ville" };
    }
  }

  if (role === "hub") {
    if (!city) return { error: "Ville requise pour le hub stock" };
    if (!canCreateStoreInCity(profile, city)) {
      return { error: "Vous ne pouvez modifier ce compte que pour votre ville" };
    }
  }

  const updates: Record<string, unknown> = {
    full_name: fullName,
    email,
    access_preset: useCustomPages ? "custom" : "full",
    allowed_pages: allowedPages,
  };

  if (role === "manager") {
    if (limitToStore && storeId) {
      const store = await getStoreById(storeId);
      updates.store_id = storeId;
      updates.city = store?.city || null;
    } else {
      updates.city = city;
      updates.store_id = null;
    }
  }

  if (role === "cashier") {
    updates.store_id = storeId;
    const store = await getStoreById(storeId!);
    updates.city = store?.city || null;
  }

  if (role === "livreur") {
    updates.city = city;
    updates.store_id = null;
  }

  if (role === "hub") {
    updates.city = city;
    updates.store_id = null;
  }

  const admin = createAdminClient();

  if (email !== normalizeUserEmail(target.email)) {
    const { error: emailError } = await admin.auth.admin.updateUserById(userId, {
      email,
      email_confirm: true,
    });
    if (emailError) return { error: mapCreateUserAuthError(emailError.message) };
  }

  if (password) {
    const { error: passwordError } = await admin.auth.admin.updateUserById(userId, {
      password,
    });
    if (passwordError) return { error: passwordError.message };
  }

  const { error: profileError } = await admin.from("profiles").update(updates).eq("id", userId);
  if (profileError) return { error: profileError.message };

  revalidateManagement();
  revalidatePath("/director/hubs");
  return { success: true };
}

export async function updateHubStoreAssignments(
  hubUserId: string,
  storeIds: string[]
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const admin = (await import("@/lib/supabase/admin")).createAdminClient();

  const { data: hubProfile } = await supabase
    .from("profiles")
    .select("id, role, city")
    .eq("id", hubUserId)
    .eq("role", "hub")
    .maybeSingle();

  if (!hubProfile?.city) return { error: "Compte dépôt introuvable" };

  const uniqueIds = [...new Set(storeIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { error: "Sélectionnez au moins un magasin" };
  }

  for (const storeId of uniqueIds) {
    const store = await getStoreById(storeId);
    if (!store || store.is_hub || !store.is_active) {
      return { error: "Magasin retail invalide" };
    }
  }

  const assignResult = await saveHubStoreAssignments(admin, hubUserId, uniqueIds);
  if ("error" in assignResult && assignResult.error) return { error: assignResult.error };

  revalidatePath("/director/hubs");
  revalidatePath("/hub");
  revalidatePath("/hub/hub-stock");
  return { success: true };
}

export async function updateHubDepot(formData: FormData) {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) return { error: "Non autorisé" };

  const userId = (formData.get("user_id") as string) || "";
  const storeIds = [...new Set(formData.getAll("hub_store_ids").map(String).filter(Boolean))];

  if (!userId) return { error: "Compte dépôt introuvable" };
  if (storeIds.length === 0) {
    return { error: "Sélectionnez au moins un magasin rattaché au dépôt" };
  }

  const supabase = await createClient();
  const { data: hubProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .eq("role", "hub")
    .maybeSingle();

  if (!hubProfile) return { error: "Compte dépôt introuvable" };

  const userResult = await updateUser(formData);
  if ("error" in userResult && userResult.error) return userResult;

  return updateHubStoreAssignments(userId, storeIds);
}

async function saveHubStoreAssignments(
  client: Awaited<ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>>,
  hubUserId: string,
  storeIds: string[]
): Promise<{ success: true } | { error: string }> {
  const uniqueIds = [...new Set(storeIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { error: "Sélectionnez au moins un magasin" };
  }

  const { data: stores, error: storesError } = await client
    .from("stores")
    .select("id, city, is_hub, is_active")
    .in("id", uniqueIds);

  if (storesError) return { error: storesError.message };
  if ((stores || []).length !== uniqueIds.length) {
    return { error: "Un ou plusieurs magasins sont introuvables" };
  }

  for (const store of stores || []) {
    if (!store.is_active || store.is_hub) {
      return { error: "Magasin retail invalide" };
    }
  }

  const { data: conflicts } = await client
    .from("hub_store_assignments")
    .select("store_id, hub_user_id")
    .in("store_id", uniqueIds)
    .neq("hub_user_id", hubUserId);

  if (conflicts && conflicts.length > 0) {
    return { error: "Un magasin ne peut être rattaché qu'à un seul dépôt" };
  }

  const { error: deleteError } = await client
    .from("hub_store_assignments")
    .delete()
    .eq("hub_user_id", hubUserId);

  if (deleteError) return { error: deleteError.message };

  const { error: insertError } = await client.from("hub_store_assignments").insert(
    uniqueIds.map((storeId) => ({
      hub_user_id: hubUserId,
      store_id: storeId,
    }))
  );

  if (insertError) return { error: insertError.message };

  return { success: true };
}

export async function updateHubManagers(
  hubUserId: string,
  managerIds: string[]
): Promise<{ success: true } | { error: string }> {
  void managerIds;
  void hubUserId;
  return { error: "Les dépôts ne sont plus associés aux gérants — utilisez les magasins rattachés" };
}

export async function syncShopifyOrders(): Promise<
  { success: true; synced: number; failed: number } | { error: string }
> {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) return { error: "Non autorisé" };

  const { runShopifyOrdersSync } = await import("@/lib/shopify/sync-orders");
  const result = await runShopifyOrdersSync(100);

  if (!result.success) {
    return { error: result.error };
  }

  revalidatePath("/director/orders");
  revalidatePath("/director/hub");
  revalidatePath("/manager/orders");
  revalidatePath("/cashier/orders");

  return { success: true, synced: result.synced, failed: result.failed };
}

export async function updateShopifyOrderStatus(
  orderId: string,
  workflowStatus: import("@/lib/types").ShopifyWorkflowStatus
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["directeur", "admin", "manager", "cashier", "livreur"]);
  if (!profile) return { error: "Non autorisé" };

  const { getShopifyOrderById, canAccessShopifyOrder } = await import(
    "@/lib/shopify/order-access"
  );
  const { resolveWorkflowStatusUpdate, livreurWorkflowStatuses } = await import(
    "@/lib/shopify/order-status"
  );
  const order = await getShopifyOrderById(orderId);
  if (!order) return { error: "Commande introuvable" };

  if (!(await canAccessShopifyOrder(profile, order))) {
    return { error: "Accès refusé" };
  }

  if (profile.role === "livreur") {
    const allowed = livreurWorkflowStatuses();
    if (!allowed.includes(workflowStatus)) {
      return { error: "Statut non autorisé pour le livreur" };
    }
    if (workflowStatus === "returned") {
      return { error: "Utilisez le bouton Retour pour saisir une note obligatoire" };
    }
    if (order.workflow_status !== "shipping") {
      return {
        error:
          "Remettez-vous la commande en caisse — seules les livraisons en cours peuvent être clôturées",
      };
    }
  }

  if (
    profile.role === "cashier" &&
    workflowStatus === "shipping" &&
    order.workflow_status !== "ready"
  ) {
    return { error: "Seules les commandes prêtes peuvent être remises au livreur" };
  }

  if (
    order.workflow_status === "cancelled" ||
    order.workflow_status === "returned" ||
    order.workflow_status === "paid"
  ) {
    return { error: "Commande déjà clôturée" };
  }

  const allowed = [
    "pending",
    "preparing",
    "ready",
    "shipping",
    "delivered",
    "returned",
  ] as const;
  if (!(allowed as readonly string[]).includes(workflowStatus)) {
    return { error: "Statut invalide" };
  }

  const effectiveStatus = resolveWorkflowStatusUpdate(workflowStatus);
  const now = new Date().toISOString();

  const supabase = await createClient();
  const updates: Record<string, unknown> = {
    workflow_status: effectiveStatus,
    updated_at: now,
  };

  if (effectiveStatus === "paid") {
    updates.financial_status = "paid";
    updates.paid_at = now;
    updates.paid_by = profile.id;
  }

  const { error } = await supabase.from("shopify_orders").update(updates).eq("id", orderId);

  if (error) return { error: error.message };

  try {
    const { notifyShopifyOrderWorkflowStatus } = await import(
      "@/lib/kapso/order-status-notifications"
    );
    await notifyShopifyOrderWorkflowStatus(
      orderId,
      effectiveStatus,
      order.workflow_status
    );
  } catch (notifyError) {
    console.error("updateShopifyOrderStatus WhatsApp:", notifyError);
  }

  const { syncShopifyWorkflowStatus } = await import("@/lib/shopify/update-order");
  await syncShopifyWorkflowStatus(order.shopify_order_id, effectiveStatus);

  revalidatePath("/director/orders");
  revalidatePath("/director/hub");
  revalidatePath("/manager/orders");
  revalidatePath("/cashier/orders");
  revalidatePath("/livreur/orders");

  return { success: true };
}

export async function markShopifyOrderReturned(
  orderId: string,
  note: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["livreur"]);
  if (!profile) return { error: "Non autorisé" };

  const { validateReturnNote } = await import("@/lib/shopify/return-note");
  const noteError = validateReturnNote(note);
  if (noteError) return { error: noteError };

  const { getShopifyOrderById, canAccessShopifyOrder } = await import(
    "@/lib/shopify/order-access"
  );
  const order = await getShopifyOrderById(orderId);
  if (!order) return { error: "Commande introuvable" };
  if (!(await canAccessShopifyOrder(profile, order))) return { error: "Accès refusé" };

  if (order.workflow_status !== "shipping") {
    return {
      error:
        "Seules les livraisons en cours peuvent être marquées en retour",
    };
  }

  const now = new Date().toISOString();
  const trimmedNote = note.trim();
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { error } = await admin
    .from("shopify_orders")
    .update({
      workflow_status: "returned",
      return_note: trimmedNote,
      return_note_at: now,
      return_note_by: profile.id,
      updated_at: now,
    })
    .eq("id", orderId);

  if (error) return { error: error.message };

  const { syncShopifyWorkflowStatus } = await import("@/lib/shopify/update-order");
  await syncShopifyWorkflowStatus(order.shopify_order_id, "returned");

  revalidatePath("/director/orders");
  revalidatePath("/director/hub");
  revalidatePath("/manager/orders");
  revalidatePath("/cashier/orders");
  revalidatePath("/cashier/returns");
  revalidatePath("/livreur/orders");
  revalidatePath("/livreur/returns");

  return { success: true };
}

export async function updateShopifyOrderReturnNote(
  orderId: string,
  note: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["livreur"]);
  if (!profile) return { error: "Non autorisé" };

  const { validateReturnNote, canLivreurEditReturnNote } = await import(
    "@/lib/shopify/return-note"
  );
  const noteError = validateReturnNote(note);
  if (noteError) return { error: noteError };

  const { getShopifyOrderById, canAccessShopifyOrder } = await import(
    "@/lib/shopify/order-access"
  );
  const order = await getShopifyOrderById(orderId);
  if (!order) return { error: "Commande introuvable" };
  if (!(await canAccessShopifyOrder(profile, order))) return { error: "Accès refusé" };

  if (!canLivreurEditReturnNote(order, profile.id)) {
    return { error: "Délai de modification dépassé (2 h)" };
  }

  const trimmedNote = note.trim();
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { error } = await admin
    .from("shopify_orders")
    .update({
      return_note: trimmedNote,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) return { error: error.message };

  revalidatePath("/livreur/orders");
  revalidatePath("/livreur/returns");
  revalidatePath("/cashier/returns");
  revalidatePath("/manager/orders");
  revalidatePath("/director/orders");
  revalidatePath("/director/hub");

  return { success: true };
}

export async function confirmShopifyOrderReturn(
  orderId: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["directeur", "admin", "manager", "cashier"]);
  if (!profile) return { error: "Non autorisé" };

  const { getShopifyOrderById, canAccessShopifyOrder } = await import(
    "@/lib/shopify/order-access"
  );
  const { orderLineItemsToRestockPayload } = await import("@/lib/shopify/order-restock");
  const { getProductCatalog } = await import("@/lib/inventory");

  const order = await getShopifyOrderById(orderId);
  if (!order) return { error: "Commande introuvable" };
  if (!(await canAccessShopifyOrder(profile, order))) return { error: "Accès refusé" };

  if (order.workflow_status !== "returned") {
    return { error: "Cette commande n'est pas en retour" };
  }

  if (!order.fulfilled_at) {
    return { error: "Commande non préparée — aucun stock à remettre" };
  }

  if (order.return_received_at) {
    return { error: "Retour déjà réceptionné en magasin" };
  }

  if (!order.store_id) {
    return { error: "Commande sans magasin assigné" };
  }

  const products = await getProductCatalog();
  const { items, missing } = orderLineItemsToRestockPayload(order.line_items, products);

  if (items.length === 0) {
    return {
      error:
        missing.length > 0
          ? `Produits non trouvés : ${missing.join(", ")}`
          : "Aucun produit à remettre en stock",
    };
  }

  const supabase = await createClient();
  const { error: restockError } = await supabase.rpc("restore_shopify_return_stock", {
    p_items: items,
    p_store_id: order.store_id,
  });

  if (restockError) return { error: restockError.message };

  const now = new Date().toISOString();
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { error } = await admin
    .from("shopify_orders")
    .update({
      return_received_at: now,
      return_received_by: profile.id,
      updated_at: now,
    })
    .eq("id", orderId);

  if (error) return { error: error.message };

  const { error: transferError } = await supabase.rpc("create_store_return_to_hub_transfer", {
    p_order_id: orderId,
    p_items: items,
  });

  if (transferError) {
    console.error("create_store_return_to_hub_transfer:", transferError.message);
  }

  revalidatePath("/cashier/returns");
  revalidatePath("/cashier/orders");
  revalidatePath("/manager/orders");
  revalidatePath("/director/orders");
  revalidatePath("/director/hub");
  revalidatePath("/livreur/returns");
  revalidatePath("/livreur/transfers");
  revalidatePath("/hub/orders");

  return { success: true };
}

export async function handOrderToLivreur(
  orderId: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["directeur", "admin", "manager", "cashier"]);
  if (!profile) return { error: "Non autorisé" };

  const { getShopifyOrderById, canAccessShopifyOrder } = await import(
    "@/lib/shopify/order-access"
  );
  const order = await getShopifyOrderById(orderId);
  if (!order) return { error: "Commande introuvable" };

  if (!(await canAccessShopifyOrder(profile, order))) {
    return { error: "Accès refusé" };
  }

  if (order.workflow_status !== "ready") {
    return { error: "Seules les commandes prêtes peuvent être remises au livreur" };
  }

  if (!order.fulfilled_at) {
    return { error: "Préparez la commande en caisse avant la remise au livreur" };
  }

  const supabase = await createClient();

  if (!order.assigned_livreur_id && (order.store_id || order.city)) {
    const { assignOrderToStoreLivreur } = await import("@/lib/shopify/assign-livreur");
    await assignOrderToStoreLivreur(orderId, order.store_id, order.city);
  }

  const { error } = await supabase
    .from("shopify_orders")
    .update({
      workflow_status: "shipping",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) return { error: error.message };

  try {
    const { notifyShopifyOrderWorkflowStatus } = await import(
      "@/lib/kapso/order-status-notifications"
    );
    await notifyShopifyOrderWorkflowStatus(orderId, "shipping", "ready");
  } catch (notifyError) {
    console.error("handOrderToLivreur WhatsApp:", notifyError);
  }

  try {
    const { syncShopifyWorkflowStatus } = await import("@/lib/shopify/update-order");
    await syncShopifyWorkflowStatus(order.shopify_order_id, "shipping");
  } catch (err) {
    console.error("Shopify sync shipping:", err);
  }

  revalidatePath("/cashier/orders");
  revalidatePath("/manager/orders");
  revalidatePath("/director/orders");
  revalidatePath("/director/hub");
  revalidatePath("/livreur/orders");

  return { success: true };
}

export async function markShopifyCodPaid(
  orderId: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["directeur", "manager", "cashier"]);
  if (!profile) return { error: "Non autorisé" };

  const { getShopifyOrderById, canAccessShopifyOrder } = await import(
    "@/lib/shopify/order-access"
  );
  const { shopifyOrderToSaleItems } = await import("@/lib/shopify/order-sale-items");
  const { getProductCatalog } = await import("@/lib/inventory");
  const order = await getShopifyOrderById(orderId);
  if (!order) return { error: "Commande introuvable" };

  if (!(await canAccessShopifyOrder(profile, order))) {
    return { error: "Accès refusé" };
  }

  if (order.payment_type !== "cod") {
    return { error: "Cette commande n'est pas en COD" };
  }

  if (order.financial_status === "paid") {
    return { error: "Commande déjà encaissée en caisse" };
  }

  if (!order.fulfilled_at) {
    return { error: "Préparez la commande en caisse avant d'encaisser le COD" };
  }

  if (order.workflow_status !== "delivered") {
    return {
      error: "La commande doit être marquée livrée par le livreur avant encaissement",
    };
  }

  const products = await getProductCatalog();
  const mapped = shopifyOrderToSaleItems(order, products);
  if ("error" in mapped) return { error: mapped.error };

  const supabase = await createClient();
  const now = new Date().toISOString();
  let saleId = order.sale_id;

  if (saleId) {
    const { error: assignError } = await supabase.rpc("assign_cod_sale_to_cashier", {
      p_sale_id: saleId,
    });
    if (assignError) return { error: assignError.message };
  } else {
    const { data: newSaleId, error: saleError } = await supabase.rpc("record_cod_payment", {
      p_items: mapped.items,
      p_store_id: order.store_id || null,
      p_customer_name: order.customer_name?.trim() || "Divers",
      p_customer_phone: order.customer_phone || null,
      p_customer_email: order.customer_email || null,
      p_shopify_order_id: orderId,
    });

    if (saleError) return { error: saleError.message };
    if (!newSaleId) return { error: "Erreur enregistrement caisse" };
    saleId = newSaleId as string;
  }

  const { error } = await supabase
    .from("shopify_orders")
    .update({
      sale_id: saleId,
      workflow_status: "paid",
      financial_status: "paid",
      paid_at: now,
      paid_by: profile.id,
      updated_at: now,
    })
    .eq("id", orderId);

  if (error) return { error: error.message };

  const { markShopifyOrderPaid, syncShopifyWorkflowStatus } = await import(
    "@/lib/shopify/update-order"
  );
  await markShopifyOrderPaid(
    order.shopify_order_id,
    Number(order.total),
    order.currency || "MAD"
  );
  await syncShopifyWorkflowStatus(order.shopify_order_id, "paid");

  revalidatePath("/cashier/orders");
  revalidatePath("/cashier/sales");
  revalidatePath("/cashier/invoices");
  revalidatePath("/manager/orders");
  revalidatePath("/manager/sales");
  revalidatePath("/manager/invoices");
  revalidatePath("/director/orders");
  revalidatePath("/director/sales");
  revalidatePath("/director/invoices");

  return { success: true };
}

export async function transferShopifyOrder(
  orderId: string,
  toStoreId: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["directeur", "admin", "manager", "cashier"]);
  if (!profile) return { error: "Non autorisé" };

  const { getShopifyOrderById, canAccessShopifyOrder } = await import(
    "@/lib/shopify/order-access"
  );
  const {
    canTransferShopifyOrder,
    isValidTransferTarget,
  } = await import("@/lib/shopify/order-transfer");
  const { getStoreById } = await import("@/lib/inventory");
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const order = await getShopifyOrderById(orderId);
  if (!order) return { error: "Commande introuvable" };

  if (!(await canAccessShopifyOrder(profile, order))) {
    return { error: "Accès refusé" };
  }

  if (!canTransferShopifyOrder(profile, order)) {
    return { error: "Cette commande ne peut plus être transférée" };
  }

  if (!order.store_id) {
    return { error: "Commande sans magasin assigné" };
  }

  const fromStore = await getStoreById(order.store_id);
  const { data: targetStore, error: targetError } = await admin
    .from("stores")
    .select("*")
    .eq("id", toStoreId)
    .maybeSingle();
  const { data: hubStore } = await admin
    .from("stores")
    .select("*")
    .eq("is_active", true)
    .eq("is_hub", true)
    .maybeSingle();

  if (targetError) return { error: targetError.message };

  if (!fromStore || !targetStore) {
    return { error: "Magasin introuvable" };
  }

  if (!isValidTransferTarget(fromStore, targetStore, hubStore)) {
    return { error: "Transfert autorisé vers un magasin de la même ville ou le hub stock" };
  }

  const now = new Date().toISOString();

  // Service role : le transfert change store_id, ce qui échoue le WITH CHECK RLS caissier/manager.
  const { error } = await admin
    .from("shopify_orders")
    .update({
      store_id: toStoreId,
      city: targetStore.city,
      transferred_from_store_id: order.store_id,
      transferred_at: now,
      transferred_by: profile.id,
      store_assignment_locked: true,
      assigned_livreur_id: null,
      workflow_status: "pending",
      updated_at: now,
    })
    .eq("id", orderId);

  if (error) return { error: error.message };

  revalidatePath("/director/orders");
  revalidatePath("/director/hub");
  revalidatePath("/manager/orders");
  revalidatePath("/cashier/orders");
  revalidatePath("/livreur/orders");

  return { success: true };
}

export async function suggestShopifyOrderRoute(orderId: string): Promise<
  | {
      targetStoreId: string | null;
      targetStoreName: string | null;
      routedToHub: boolean;
      currentStoreCanFulfill: boolean;
      reason: string;
    }
  | { error: string }
> {
  const profile = await requireRole(["directeur", "admin", "manager", "cashier"]);
  if (!profile) return { error: "Non autorisé" };

  const { getShopifyOrderById, canAccessShopifyOrder } = await import(
    "@/lib/shopify/order-access"
  );
  const { resolveShopifyOrderRoute } = await import("@/lib/shopify/auto-route-order");
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const order = await getShopifyOrderById(orderId);
  if (!order) return { error: "Commande introuvable" };
  if (!(await canAccessShopifyOrder(profile, order))) return { error: "Accès refusé" };
  if (!order.store_id) return { error: "Commande sans magasin assigné" };

  const resolved = await resolveShopifyOrderRoute(admin, {
    id: order.id,
    store_id: order.store_id,
    city: order.city,
    line_items: order.line_items,
    shipping_address: order.shipping_address,
    shipping_lat: order.shipping_lat,
    shipping_lng: order.shipping_lng,
    store_assignment_locked: order.store_assignment_locked,
    workflow_status: order.workflow_status,
    fulfilled_at: order.fulfilled_at,
    sale_id: order.sale_id,
    order_status: order.order_status,
  });

  if ("error" in resolved) return { error: resolved.error ?? "Erreur inconnue" };
  return resolved.route;
}

export async function autoRouteShopifyOrder(
  orderId: string
): Promise<{ success: true; targetStoreName: string } | { error: string }> {
  const profile = await requireRole(["directeur", "admin", "manager", "cashier"]);
  if (!profile) return { error: "Non autorisé" };

  const { getShopifyOrderById, canAccessShopifyOrder } = await import(
    "@/lib/shopify/order-access"
  );
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { maybeAutoRouteShopifyOrder } = await import("@/lib/shopify/auto-route-order");
  const admin = createAdminClient();

  const order = await getShopifyOrderById(orderId);
  if (!order) return { error: "Commande introuvable" };
  if (!(await canAccessShopifyOrder(profile, order))) return { error: "Accès refusé" };

  const result = await maybeAutoRouteShopifyOrder(admin, {
    id: order.id,
    store_id: order.store_id,
    city: order.city,
    line_items: order.line_items,
    shipping_address: order.shipping_address,
    shipping_lat: order.shipping_lat,
    shipping_lng: order.shipping_lng,
    store_assignment_locked: order.store_assignment_locked,
    workflow_status: order.workflow_status,
    fulfilled_at: order.fulfilled_at,
    sale_id: order.sale_id,
    order_status: order.order_status,
  }, { transferredBy: profile.id });

  if (!result.routed) {
    if (result.reason.includes("suffisant")) {
      return { error: "Stock suffisant dans ce magasin — transfert inutile" };
    }
    return { error: result.reason };
  }

  revalidatePath("/director/orders");
  revalidatePath("/director/hub");
  revalidatePath("/manager/orders");
  revalidatePath("/cashier/orders");
  revalidatePath("/livreur/orders");

  return {
    success: true,
    targetStoreName: result.targetStoreName,
  };
}

export async function updateShopifyOrderConfirmationFollowUp(
  orderId: string,
  status: import("@/lib/shopify/confirmation-follow-up").CashierConfirmationStatus,
  note?: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["directeur", "admin", "manager", "cashier"]);
  if (!profile) return { error: "Non autorisé" };

  const { getShopifyOrderById, canAccessShopifyOrder } = await import(
    "@/lib/shopify/order-access"
  );

  const order = await getShopifyOrderById(orderId);
  if (!order) return { error: "Commande introuvable" };
  if (!(await canAccessShopifyOrder(profile, order))) return { error: "Accès refusé" };

  if (!order.whatsapp_confirmation_sent_at) {
    return { error: "Aucune demande WhatsApp envoyée pour cette commande" };
  }

  if (order.customer_confirmed_at) {
    return { error: "Le client a déjà confirmé via WhatsApp" };
  }

  const trimmedNote =
    status === "confirmed" ? null : note?.trim() || null;
  const now = new Date().toISOString();

  const supabase = await createClient();
  const { error } = await supabase
    .from("shopify_orders")
    .update({
      cashier_confirmation_status: status,
      cashier_confirmation_note: trimmedNote,
      cashier_confirmation_at: now,
      cashier_confirmation_by: profile.id,
      updated_at: now,
    })
    .eq("id", orderId);

  if (error) return { error: error.message };

  if (trimmedNote) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const { syncCashierFollowUpNoteToLoyaltyCard } = await import(
        "@/lib/loyalty/customer-notes"
      );
      const admin = createAdminClient();
      await syncCashierFollowUpNoteToLoyaltyCard(admin, {
        shopifyOrderId: orderId,
        orderNumber: order.order_number,
        customerPhone: order.customer_phone,
        customerId: order.customer_id,
        note: trimmedNote,
        source: "cashier_follow_up",
      });
    } catch (noteError) {
      console.error("updateShopifyOrderConfirmationFollowUp loyalty note:", noteError);
    }
  }

  revalidatePath("/cashier/orders");
  revalidatePath("/cashier/notes");
  revalidatePath("/manager/orders");
  revalidatePath("/director/orders");

  return { success: true };
}

export async function resolveStoreComplaint(
  complaintId: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["directeur", "admin", "manager"]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { data: complaint, error: fetchError } = await supabase
    .from("store_complaints")
    .select("id, store_id, status")
    .eq("id", complaintId)
    .maybeSingle();

  if (fetchError || !complaint) return { error: "Réclamation introuvable" };
  if (complaint.status === "resolved") return { success: true };

  if (profile.role === "manager") {
    if (!complaint.store_id) return { error: "Non autorisé" };
    const access = await assertStoreAccess(profile, complaint.store_id);
    if (access.error) return { error: access.error };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("store_complaints")
    .update({
      status: "resolved",
      resolved_at: now,
      resolved_by: profile.id,
    })
    .eq("id", complaintId);

  if (error) return { error: error.message };

  revalidatePath("/manager/reclamations");
  revalidatePath("/director/reclamations");

  return { success: true };
}

function parseShiftTime(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) return null;
  return trimmed.length === 5 ? `${trimmed}:00` : trimmed;
}

async function assertCashierCanWorkAtStore(
  supabase: Awaited<ReturnType<typeof createClient>>,
  cashierId: string,
  storeId: string,
  shiftDate: string,
  cityStoreIds: string[]
): Promise<{ error?: string }> {
  const { data } = await supabase
    .from("store_planning_cashiers")
    .select("id, store_id, is_active")
    .eq("id", cashierId)
    .eq("is_active", true)
    .maybeSingle();

  if (!data?.store_id || !cityStoreIds.includes(data.store_id)) {
    return { error: "Caissier invalide pour cette ville" };
  }

  if (data.store_id === storeId) return {};

  const admin = createAdminClient();
  const { data: transfer } = await admin
    .from("cashier_store_transfers")
    .select("id, kind, start_date, end_date")
    .eq("cashier_id", cashierId)
    .eq("to_store_id", storeId)
    .lte("start_date", shiftDate)
    .order("start_date", { ascending: false })
    .limit(5);

  const active = (transfer || []).find((row) => {
    if (shiftDate < (row.start_date as string)) return false;
    if (!row.end_date) return true;
    return shiftDate <= (row.end_date as string);
  });

  if (!active) {
    return { error: "Ce caissier n'est pas affecté à ce magasin pour cette date" };
  }

  return {};
}

async function assertNoShiftConflict(input: {
  cashierId: string;
  shiftDate: string;
  excludeId?: string;
}): Promise<{ error?: string }> {
  const admin = createAdminClient();
  let query = admin
    .from("cashier_shifts")
    .select("id, start_time, end_time, store_id, store:stores!store_id(name)")
    .eq("cashier_id", input.cashierId)
    .eq("shift_date", input.shiftDate);

  if (input.excludeId) {
    query = query.neq("id", input.excludeId);
  }

  const { data } = await query.limit(1);
  const row = data?.[0];
  if (!row) return {};

  const storeRel = row.store as { name?: string } | { name?: string }[] | null;
  const storeName = Array.isArray(storeRel) ? storeRel[0]?.name : storeRel?.name;
  const hours = `${row.start_time.slice(0, 5)} – ${row.end_time.slice(0, 5)}`;
  const where = storeName ? ` au magasin ${storeName}` : "";
  return {
    error: `Ce caissier a déjà un créneau ce jour${where} (${hours}). Un seul créneau par jour est autorisé.`,
  };
}

async function assertNotWeekOff(
  cashierId: string,
  shiftDate: string,
  weekStart: string
): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("cashier_week_offs")
    .select("off_date")
    .eq("cashier_id", cashierId)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (data?.off_date === shiftDate) {
    return { error: "Ce jour est le jour de repos de ce caissier pour cette semaine" };
  }

  return {};
}

function normalizeWeekStart(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export async function createCashierShift(input: {
  storeId: string;
  cashierId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  notes?: string | null;
}): Promise<{ success: true; id: string } | { error: string }> {
  const profile = await requireRole([...MANAGEMENT]);
  if (!profile) return { error: "Non autorisé" };

  const access = await assertStoreAccess(profile, input.storeId);
  if (access.error) return { error: access.error };

  const shiftDate = input.shiftDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(shiftDate)) {
    return { error: "Date invalide" };
  }

  const startTime = parseShiftTime(input.startTime);
  const endTime = parseShiftTime(input.endTime);
  if (!startTime || !endTime) return { error: "Horaires invalides" };
  if (endTime <= startTime) return { error: "L'heure de fin doit être après le début" };

  const supabase = await createClient();

  const { data: cityStores } = await supabase
    .from("stores")
    .select("id")
    .eq("city", access.store!.city);
  const storeIds = (cityStores || []).map((s) => s.id);

  const cashierCheck = await assertCashierCanWorkAtStore(
    supabase,
    input.cashierId,
    input.storeId,
    shiftDate,
    storeIds
  );
  if (cashierCheck.error) return { error: cashierCheck.error };

  const weekStart = normalizeWeekStart(shiftDate);
  const weekOffCheck = await assertNotWeekOff(input.cashierId, shiftDate, weekStart);
  if (weekOffCheck.error) return { error: weekOffCheck.error };

  const conflict = await assertNoShiftConflict({
    cashierId: input.cashierId,
    shiftDate,
  });
  if (conflict.error) return { error: conflict.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cashier_shifts")
    .insert({
      store_id: input.storeId,
      cashier_id: input.cashierId,
      shift_date: shiftDate,
      start_time: startTime,
      end_time: endTime,
      notes: input.notes?.trim() || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/manager/planning");
  revalidatePath("/director/planning");
  revalidatePath("/cashier/planning");
  return { success: true, id: data.id };
}

export async function deleteCashierShift(
  shiftId: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole([...MANAGEMENT]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { data: shift, error: fetchError } = await supabase
    .from("cashier_shifts")
    .select("id, store_id")
    .eq("id", shiftId)
    .maybeSingle();

  if (fetchError || !shift) return { error: "Créneau introuvable" };

  const access = await assertStoreAccess(profile, shift.store_id);
  if (access.error) return { error: access.error };

  const admin = createAdminClient();
  const { error } = await admin.from("cashier_shifts").delete().eq("id", shiftId);
  if (error) return { error: error.message };

  revalidatePath("/manager/planning");
  revalidatePath("/director/planning");
  revalidatePath("/cashier/planning");
  return { success: true };
}

export async function createCashierStoreTransfer(input: {
  cashierId: string;
  toStoreId: string;
  kind: "permanent" | "temporary";
  startDate: string;
  endDate?: string | null;
}): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole([...MANAGEMENT]);
  if (!profile) return { error: "Non autorisé" };

  const startDate = input.startDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return { error: "Date de début invalide" };
  }

  if (input.kind === "temporary") {
    const endDate = input.endDate?.trim();
    if (!endDate || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return { error: "Date de fin requise pour un transfert temporaire" };
    }
    if (endDate < startDate) {
      return { error: "La date de fin doit être après le début" };
    }
  }

  const supabase = await createClient();
  const { data: cashier } = await supabase
    .from("store_planning_cashiers")
    .select("id, store_id")
    .eq("id", input.cashierId)
    .eq("is_active", true)
    .maybeSingle();

  if (!cashier?.store_id) return { error: "Caissier introuvable" };
  if (cashier.store_id === input.toStoreId) {
    return { error: "Le caissier est déjà affecté à ce magasin" };
  }

  const fromAccess = await assertStoreAccess(profile, cashier.store_id);
  if (fromAccess.error) return { error: fromAccess.error };

  const toAccess = await assertStoreAccess(profile, input.toStoreId);
  if (toAccess.error) return { error: toAccess.error };

  const admin = createAdminClient();

  const { error: insertError } = await admin.from("cashier_store_transfers").insert({
    cashier_id: input.cashierId,
    from_store_id: cashier.store_id,
    to_store_id: input.toStoreId,
    kind: input.kind,
    start_date: startDate,
    end_date: input.kind === "temporary" ? input.endDate!.trim() : null,
    created_by: profile.id,
  });

  if (insertError) return { error: insertError.message };

  if (input.kind === "permanent") {
    const { error: updateError } = await admin
      .from("store_planning_cashiers")
      .update({ store_id: input.toStoreId })
      .eq("id", input.cashierId);

    if (updateError) return { error: updateError.message };
  }

  revalidatePath("/manager/planning");
  revalidatePath("/director/planning");
  revalidatePath("/cashier/planning");
  return { success: true };
}

export async function planCashierWeek(input: {
  storeId: string;
  weekStart: string;
  startTime: string;
  endTime: string;
}): Promise<{ success: true; created: number; skipped: number } | { error: string }> {
  const profile = await requireRole([...MANAGEMENT]);
  if (!profile) return { error: "Non autorisé" };

  const access = await assertStoreAccess(profile, input.storeId);
  if (access.error) return { error: access.error };

  const weekStart = normalizeWeekStart(input.weekStart);
  const startTime = parseShiftTime(input.startTime);
  const endTime = parseShiftTime(input.endTime);
  if (!startTime || !endTime) return { error: "Horaires invalides" };
  if (endTime <= startTime) return { error: "L'heure de fin doit être après le début" };

  const supabase = await createClient();
  const { data: cityStores } = await supabase
    .from("stores")
    .select("id")
    .eq("city", access.store!.city);
  const storeIds = (cityStores || []).map((s) => s.id);

  const { getCityCashiers } = await import("@/lib/scheduling/shifts");
  const allCashiers = await getCityCashiers(storeIds);

  const { getCashierStoreTransfers } = await import("@/lib/scheduling/transfers");
  const { getPlanningCashiersForStore, cashierWorksAtStoreOnDate } = await import(
    "@/lib/scheduling/transfer-utils"
  );

  const transfers = await getCashierStoreTransfers({ weekStart, storeIds });
  const planningCashiers = getPlanningCashiersForStore({
    storeId: input.storeId,
    weekStart,
    allCashiers,
    transfers,
  });

  const admin = createAdminClient();
  const weekEnd = (() => {
    const d = new Date(`${weekStart}T12:00:00`);
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  })();

  const [{ data: weekOffRows }, { data: shiftRows }] = await Promise.all([
    admin
      .from("cashier_week_offs")
      .select("cashier_id, off_date")
      .eq("week_start", weekStart)
      .in(
        "cashier_id",
        planningCashiers.map((c) => c.id)
      ),
    admin
      .from("cashier_shifts")
      .select("cashier_id, shift_date")
      .gte("shift_date", weekStart)
      .lte("shift_date", weekEnd)
      .in(
        "cashier_id",
        planningCashiers.map((c) => c.id)
      ),
  ]);

  const weekDays = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(`${weekStart}T12:00:00`);
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  });

  let created = 0;
  let skipped = 0;

  for (const cashier of planningCashiers) {
    if (!cashier.is_active) {
      skipped += weekDays.length;
      continue;
    }

    for (const day of weekDays) {
      if (
        !cashierWorksAtStoreOnDate({
          cashier,
          storeId: input.storeId,
          date: day,
          transfers,
        })
      ) {
        skipped += 1;
        continue;
      }

      if (weekOffRows?.some((o) => o.cashier_id === cashier.id && o.off_date === day)) {
        skipped += 1;
        continue;
      }

      if (shiftRows?.some((s) => s.cashier_id === cashier.id && s.shift_date === day)) {
        skipped += 1;
        continue;
      }

      const { error } = await admin.from("cashier_shifts").insert({
        store_id: input.storeId,
        cashier_id: cashier.id,
        shift_date: day,
        start_time: startTime,
        end_time: endTime,
        notes: null,
        created_by: profile.id,
      });

      if (error) {
        skipped += 1;
        continue;
      }

      created += 1;
    }
  }

  revalidatePath("/manager/planning");
  revalidatePath("/director/planning");
  revalidatePath("/cashier/planning");
  return { success: true, created, skipped };
}

export async function setCashierWeekOff(input: {
  cashierId: string;
  weekStart: string;
  offDate: string;
}): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole([...MANAGEMENT]);
  if (!profile) return { error: "Non autorisé" };

  const weekStart = normalizeWeekStart(input.weekStart);
  const offDate = input.offDate.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(offDate)) {
    return { error: "Date de repos invalide" };
  }

  const weekEnd = (() => {
    const d = new Date(`${weekStart}T12:00:00`);
    d.setDate(d.getDate() + 6);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  })();

  if (offDate < weekStart || offDate > weekEnd) {
    return { error: "Le jour de repos doit être dans la semaine affichée" };
  }

  const supabase = await createClient();
  const { data: cashier } = await supabase
    .from("store_planning_cashiers")
    .select("id, store_id")
    .eq("id", input.cashierId)
    .eq("is_active", true)
    .maybeSingle();

  if (!cashier?.store_id) return { error: "Caissier introuvable" };

  const access = await assertStoreAccess(profile, cashier.store_id);
  if (access.error) return { error: access.error };

  const admin = createAdminClient();

  const { data: conflicting } = await admin
    .from("cashier_shifts")
    .select("id")
    .eq("cashier_id", input.cashierId)
    .eq("shift_date", offDate)
    .limit(1);

  if (conflicting && conflicting.length > 0) {
    return {
      error: "Supprimez d'abord les créneaux de ce caissier sur ce jour avant de le mettre en repos",
    };
  }

  const { error } = await admin.from("cashier_week_offs").upsert(
    {
      cashier_id: input.cashierId,
      week_start: weekStart,
      off_date: offDate,
      created_by: profile.id,
    },
    { onConflict: "cashier_id,week_start" }
  );

  if (error) return { error: error.message };

  revalidatePath("/manager/planning");
  revalidatePath("/director/planning");
  revalidatePath("/cashier/planning");
  return { success: true };
}

export async function clearCashierWeekOff(input: {
  cashierId: string;
  weekStart: string;
}): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole([...MANAGEMENT]);
  if (!profile) return { error: "Non autorisé" };

  const weekStart = normalizeWeekStart(input.weekStart);
  const supabase = await createClient();
  const { data: cashier } = await supabase
    .from("store_planning_cashiers")
    .select("id, store_id")
    .eq("id", input.cashierId)
    .maybeSingle();

  if (!cashier?.store_id) return { error: "Caissier introuvable" };

  const access = await assertStoreAccess(profile, cashier.store_id);
  if (access.error) return { error: access.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("cashier_week_offs")
    .delete()
    .eq("cashier_id", input.cashierId)
    .eq("week_start", weekStart);

  if (error) return { error: error.message };

  revalidatePath("/manager/planning");
  revalidatePath("/director/planning");
  revalidatePath("/cashier/planning");
  return { success: true };
}

export async function createPlanningCashier(input: {
  storeId: string;
  fullName: string;
}): Promise<{ success: true; id: string } | { error: string }> {
  const profile = await requireRole([...MANAGEMENT]);
  if (!profile) return { error: "Non autorisé" };

  const access = await assertStoreAccess(profile, input.storeId);
  if (access.error) return { error: access.error };

  const fullName = input.fullName.trim();
  if (!fullName) return { error: "Le nom est requis" };

  const supabase = await createClient();
  const { data: lastRow } = await supabase
    .from("store_planning_cashiers")
    .select("sort_order")
    .eq("store_id", input.storeId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("store_planning_cashiers")
    .insert({
      store_id: input.storeId,
      full_name: fullName,
      sort_order: (lastRow?.sort_order ?? -1) + 1,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/manager/planning");
  revalidatePath("/director/planning");
  revalidatePath("/cashier/planning");
  return { success: true, id: data.id };
}

export async function deactivatePlanningCashier(
  cashierId: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole([...MANAGEMENT]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { data: cashier } = await supabase
    .from("store_planning_cashiers")
    .select("id, store_id")
    .eq("id", cashierId)
    .eq("is_active", true)
    .maybeSingle();

  if (!cashier?.store_id) return { error: "Caissier introuvable" };

  const access = await assertStoreAccess(profile, cashier.store_id);
  if (access.error) return { error: access.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("store_planning_cashiers")
    .update({ is_active: false })
    .eq("id", cashierId);

  if (error) return { error: error.message };

  revalidatePath("/manager/planning");
  revalidatePath("/director/planning");
  revalidatePath("/cashier/planning");
  return { success: true };
}


export async function getStoreProClientLink(
  storeId: string
): Promise<
  | { success: true; storeToken: string; url: string; storeName: string }
  | { error: string }
> {
  const profile = await requireRole([...MANAGEMENT, "cashier", "hub"]);
  if (!profile) return { error: "Non autorisé" };

  if (!storeId) return { error: "Magasin requis" };

  const store = await getStoreById(storeId);
  if (!store) return { error: "Magasin introuvable" };
  if (!canAccessStore(profile, store)) {
    return { error: "Vous n'avez pas accès à ce magasin" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_store_pro_client_link", {
    p_store_id: storeId,
  });

  if (error) return { error: error.message };

  const row = data as { store_token?: string; store_name?: string };
  if (!row?.store_token) return { error: "QR code magasin indisponible" };

  const { proClientStoreRegistrationUrl } = await import("@/lib/pro-client/urls");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || undefined;

  return {
    success: true,
    storeToken: row.store_token,
    storeName: row.store_name || "Magasin",
    url: proClientStoreRegistrationUrl(row.store_token, baseUrl),
  };
}

export async function toggleProClientActive(
  customerId: string,
  active: boolean
): Promise<{ success: true; customer: import("@/lib/types").LoyaltyCustomer } | { error: string }> {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("toggle_pro_client_active", {
    p_customer_id: customerId,
    p_active: active,
  });

  if (error) return { error: error.message };

  revalidatePath("/director/clients");
  revalidatePath("/director/pro-clients");
  revalidatePath("/director/loyalty");
  revalidatePath("/director/loyalty/customers");
  revalidatePath("/manager/loyalty");
  revalidatePath("/cashier/pos");
  revalidatePath("/cashier/pro-clients");
  return { success: true, customer: data as import("@/lib/types").LoyaltyCustomer };
}

export async function toggleLoyaltyCustomerActive(
  customerId: string,
  active: boolean
): Promise<{ success: true; customer: import("@/lib/types").LoyaltyCustomer } | { error: string }> {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("toggle_loyalty_customer_active", {
    p_customer_id: customerId,
    p_active: active,
  });

  if (error) return { error: error.message };

  revalidatePath("/director/clients");
  revalidatePath("/director/loyalty/customers");
  revalidatePath("/director/loyalty");
  revalidatePath("/cashier/pos");
  return { success: true, customer: data as import("@/lib/types").LoyaltyCustomer };
}

export async function deleteLoyaltyCustomer(
  customerId: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_loyalty_customer", {
    p_customer_id: customerId,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("foreign key") || message.includes("violates")) {
      return {
        error:
          "Suppression impossible : ce client a de l'historique (ventes, points…). Désactivez-le à la place.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/director/clients");
  revalidatePath("/director/loyalty/customers");
  revalidatePath("/director/loyalty");
  revalidatePath("/cashier/pos");
  return { success: true };
}

export async function deleteProClientCustomer(
  customerId: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_pro_client_customer", {
    p_customer_id: customerId,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("foreign key") || message.includes("violates")) {
      return {
        error:
          "Suppression impossible : ce client a de l'historique (ventes, points…). Désactivez-le à la place.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/director/clients");
  revalidatePath("/director/pro-clients");
  revalidatePath("/director/loyalty");
  revalidatePath("/director/loyalty/customers");
  revalidatePath("/cashier/pos");
  revalidatePath("/cashier/pro-clients");
  return { success: true };
}

export async function createStoreProductWriteoff(input: {
  items: { productId: string; quantity: number; reason: "expired" | "broken" }[];
  notes?: string;
}): Promise<{ success: true; writeoffId: string } | { error: string }> {
  const profile = await requireRole(["cashier", "hub"]);
  if (!profile) return { error: "Non autorisé" };

  if (!input.items.length) return { error: "Ajoutez au moins un produit" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_store_product_writeoff", {
    p_items: input.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      reason: item.reason,
    })),
    p_notes: input.notes?.trim() || null,
  });

  if (error) return { error: error.message };

  revalidateWriteoffPaths();
  return { success: true, writeoffId: data as string };
}

export async function validateStoreProductWriteoff(
  writeoffId: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["directeur", "admin", "manager"]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("validate_store_product_writeoff", {
    p_writeoff_id: writeoffId,
  });

  if (error) return { error: error.message };

  revalidateWriteoffPaths();
  revalidateManagement();
  return { success: true };
}

export async function rejectStoreProductWriteoff(
  writeoffId: string,
  note?: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["directeur", "admin", "manager"]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_store_product_writeoff", {
    p_writeoff_id: writeoffId,
    p_note: note?.trim() || null,
  });

  if (error) return { error: error.message };

  revalidateWriteoffPaths();
  return { success: true };
}
