"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { canManageStore, canCreateStoreInCity, canCreateRole } from "@/lib/permissions";
import { NATUS_CITIES } from "@/lib/constants/cities";
import { getStoreById } from "@/lib/inventory";
import { PRODUCT_BRAND, PRODUCT_CATEGORIES } from "@/lib/constants/products";
import { uploadProductImage } from "@/lib/storage";
import type { Profile } from "@/lib/types";

const MANAGEMENT = ["directeur", "manager"] as const;

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

function revalidateManagement() {
  revalidatePath("/manager/products");
  revalidatePath("/manager/stock");
  revalidatePath("/manager/activity");
  revalidatePath("/manager/stores");
  revalidatePath("/manager/users");
  revalidatePath("/director/products");
  revalidatePath("/director/stock");
  revalidatePath("/director/activity");
  revalidatePath("/director/stores");
  revalidatePath("/director/users");
  revalidatePath("/cashier/pos");
}

async function assertStoreAccess(profile: Profile, storeId: string) {
  const store = await getStoreById(storeId);
  if (!store) return { error: "Magasin introuvable" };
  if (!canManageStore(profile, store)) {
    return { error: "Vous n'avez pas accès à ce magasin" };
  }
  return { store };
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

  const barcode = ((formData.get("barcode") as string) || "").trim();
  if (!barcode) return { error: "Code-barres requis" };

  const category = parseCategory(formData.get("category"));
  if (!category) return { error: "Veuillez sélectionner une catégorie" };

  const storeStocks = parseStoreStocks(formData);

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("products")
    .select("id, name, barcode, price, category, stock, image_url, description, brand")
    .eq("barcode", barcode)
    .maybeSingle();

  if (existing) {
    return {
      error: "Ce produit est déjà ajouté dans le catalogue",
      existingProduct: existing,
    };
  }

  const imageResult = await resolveProductImageUrl(supabase, formData, category, true);
  if ("error" in imageResult && imageResult.error) return { error: imageResult.error };
  if (!imageResult.url) return { error: "L'image du produit est obligatoire" };

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      name: formData.get("name") as string,
      barcode,
      description: (formData.get("description") as string) || null,
      price: parseFloat(formData.get("price") as string),
      stock: 0,
      category,
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
  return { success: true };
}

export async function updateProduct(id: string, formData: FormData) {
  const profile = await requireRole([...MANAGEMENT]);
  if (!profile) return { error: "Non autorisé" };

  const barcode = ((formData.get("barcode") as string) || "").trim();
  if (!barcode) return { error: "Code-barres requis" };

  const category = parseCategory(formData.get("category"));
  if (!category) return { error: "Catégorie invalide" };

  const supabase = await createClient();

  const { data: duplicate } = await supabase
    .from("products")
    .select("id")
    .eq("barcode", barcode)
    .neq("id", id)
    .maybeSingle();

  if (duplicate) {
    return { error: "Ce code-barres est déjà utilisé par un autre produit" };
  }

  const imageResult = await resolveProductImageUrl(supabase, formData, category, false);
  if ("error" in imageResult && imageResult.error) return { error: imageResult.error };

  const updatePayload: Record<string, unknown> = {
    name: formData.get("name") as string,
    barcode,
    description: (formData.get("description") as string) || null,
    price: parseFloat(formData.get("price") as string),
    category,
    brand: PRODUCT_BRAND,
  };

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
  const profile = await requireRole([...MANAGEMENT]);
  if (!profile) return { error: "Non autorisé" };

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: "La quantité doit être un nombre positif (minimum 1)" };
  }
  if (!storeId) return { error: "Veuillez sélectionner un magasin" };

  const access = await assertStoreAccess(profile, storeId);
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
  });

  revalidateManagement();
  return { success: true };
}

export async function setProductStock(
  productId: string,
  stock: number,
  storeId: string
) {
  const profile = await requireRole(["directeur"]);
  if (!profile) return { error: "Seul le directeur peut modifier le stock actuel" };

  if (stock < 0) return { error: "Le stock ne peut pas être négatif" };
  if (!storeId) return { error: "Veuillez sélectionner un magasin" };

  const access = await assertStoreAccess(profile, storeId);
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
      type: "adjustment",
      notes: "Ajustement manuel",
      created_by: profile.id,
      store_id: storeId,
    });
  }

  revalidateManagement();
  return { success: true };
}

export async function getProductStoreStock(productId: string, storeId: string) {
  const profile = await requireRole([...MANAGEMENT]);
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
  const profile = await requireRole(["directeur"]);
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
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidateManagement();
  return { success: true };
}

export async function completeSale(
  items: { product_id: string; quantity: number }[],
  paymentMethod: "cash" | "card" = "cash",
  storeId?: string
) {
  const profile = await requireRole([...MANAGEMENT, "cashier"]);
  if (!profile) return { error: "Non autorisé" };

  if (items.length === 0) return { error: "Panier vide" };

  if (storeId && profile.role !== "cashier") {
    const access = await assertStoreAccess(profile, storeId);
    if (access.error) return { error: access.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_sale", {
    p_items: items,
    p_payment_method: paymentMethod,
    p_store_id: storeId || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/cashier/pos");
  revalidatePath("/cashier/sales");
  revalidatePath("/manager/sales");
  revalidatePath("/manager");
  revalidatePath("/director/sales");
  revalidatePath("/director");
  return { success: true, saleId: data as string };
}

export async function completeShopifyOrderSale(
  shopifyOrderId: string,
  items: { product_id: string; quantity: number }[],
  paymentMethod: "cash" | "card" = "cash",
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

  if (order.sale_id) return { error: "Commande déjà encaissée" };

  const saleResult = await completeSale(items, paymentMethod, storeId);
  if (saleResult.error || !saleResult.saleId) {
    return { error: saleResult.error || "Erreur vente" };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    sale_id: saleResult.saleId,
    workflow_status: "preparing",
    updated_at: now,
  };

  const { error: updateError } = await supabase
    .from("shopify_orders")
    .update(updates)
    .eq("id", shopifyOrderId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/cashier/orders");
  revalidatePath("/manager/orders");
  revalidatePath("/director/orders");

  return { success: true, saleId: saleResult.saleId };
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

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;
  const role = formData.get("role") as "manager" | "cashier";
  const city = ((formData.get("city") as string) || "").trim() || null;
  const storeId = (formData.get("store_id") as string) || null;

  if (!canCreateRole(profile, role)) {
    return { error: "Vous n'êtes pas autorisé à créer ce type de compte" };
  }

  if (role === "manager") {
    if (!city) return { error: "Ville requise pour le gérant" };
    if (!canCreateStoreInCity(profile, city)) {
      return { error: "Vous ne pouvez créer un gérant que pour votre ville" };
    }
  }

  if (role === "cashier") {
    if (!storeId) return { error: "Magasin requis pour le caissier" };
    const store = await getStoreById(storeId);
    if (!store) return { error: "Magasin introuvable" };
    if (!canManageStore(profile, store)) {
      return { error: "Ce magasin n'est pas dans votre périmètre" };
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role,
        city: role === "manager" ? city : undefined,
      },
    },
  });

  if (error) return { error: error.message };

  if (data.user) {
    const updates: Record<string, unknown> = {
      full_name: fullName,
      role,
    };

    if (role === "manager") {
      updates.city = city;
      updates.store_id = null;
    }

    if (role === "cashier" && storeId) {
      updates.store_id = storeId;
      const store = await getStoreById(storeId);
      updates.city = store?.city || null;
    }

    await supabase.from("profiles").update(updates).eq("id", data.user.id);
  }

  revalidateManagement();
  return { success: true };
}

export async function syncShopifyOrders(): Promise<
  { success: true; synced: number; failed: number } | { error: string }
> {
  const profile = await requireRole(["directeur"]);
  if (!profile) return { error: "Non autorisé" };

  try {
    const { fetchShopifyOrders, isShopifyConfigured } = await import(
      "@/lib/shopify/client"
    );
    const { processShopifyOrder } = await import("@/lib/shopify/process-order");

    if (!isShopifyConfigured()) {
      return { error: "Shopify non configuré (variables d'environnement)" };
    }

    const orders = await fetchShopifyOrders(100);
    let synced = 0;
    let failed = 0;

    for (const order of orders) {
      const result = await processShopifyOrder(order);
      if (result.ok) synced++;
      else failed++;
    }

    revalidatePath("/director/orders");
    revalidatePath("/manager/orders");
    revalidatePath("/cashier/orders");

    return { success: true, synced, failed };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur sync Shopify" };
  }
}

export async function updateShopifyOrderStatus(
  orderId: string,
  workflowStatus: import("@/lib/types").ShopifyWorkflowStatus
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["directeur", "manager", "cashier"]);
  if (!profile) return { error: "Non autorisé" };

  const { getShopifyOrderById, canAccessShopifyOrder } = await import(
    "@/lib/shopify/order-access"
  );
  const order = await getShopifyOrderById(orderId);
  if (!order) return { error: "Commande introuvable" };

  if (!(await canAccessShopifyOrder(profile, order))) {
    return { error: "Accès refusé" };
  }

  if (
    order.workflow_status === "cancelled" ||
    order.workflow_status === "delivered" ||
    order.workflow_status === "returned"
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

  const supabase = await createClient();
  const updates: Record<string, unknown> = {
    workflow_status: workflowStatus,
    updated_at: new Date().toISOString(),
  };

  if (workflowStatus === "paid") {
    updates.financial_status = "paid";
    updates.paid_at = new Date().toISOString();
    updates.paid_by = profile.id;
  }

  const { error } = await supabase.from("shopify_orders").update(updates).eq("id", orderId);

  if (error) return { error: error.message };

  try {
    const { syncShopifyWorkflowStatus, markShopifyOrderPaid } = await import(
      "@/lib/shopify/update-order"
    );

    if (workflowStatus === "paid" && order.payment_type === "cod") {
      await markShopifyOrderPaid(
        order.shopify_order_id,
        Number(order.total),
        order.currency || "MAD"
      );
    } else if (process.env.SHOPIFY_SHOP_DOMAIN) {
      await syncShopifyWorkflowStatus(order.shopify_order_id, workflowStatus);
    }
  } catch (err) {
    console.error("Shopify sync:", err);
  }

  revalidatePath("/director/orders");
  revalidatePath("/manager/orders");
  revalidatePath("/cashier/orders");

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
  const order = await getShopifyOrderById(orderId);
  if (!order) return { error: "Commande introuvable" };

  if (!(await canAccessShopifyOrder(profile, order))) {
    return { error: "Accès refusé" };
  }

  if (order.payment_type !== "cod") {
    return { error: "Cette commande n'est pas en COD" };
  }

  if (order.financial_status === "paid") {
    return { error: "Commande déjà payée" };
  }

  if (!order.sale_id) {
    return { error: "Préparez la commande avant d'encaisser le COD" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("shopify_orders")
    .update({
      workflow_status: "paid",
      financial_status: "paid",
      paid_at: new Date().toISOString(),
      paid_by: profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) return { error: error.message };

  try {
    const { markShopifyOrderPaid, syncShopifyWorkflowStatus } = await import(
      "@/lib/shopify/update-order"
    );
    await markShopifyOrderPaid(
      order.shopify_order_id,
      Number(order.total),
      order.currency || "MAD"
    );
    await syncShopifyWorkflowStatus(order.shopify_order_id, "paid");
  } catch (err) {
    console.error("Shopify COD payé:", err);
  }

  revalidatePath("/director/orders");
  revalidatePath("/manager/orders");
  revalidatePath("/cashier/orders");

  return { success: true };
}
