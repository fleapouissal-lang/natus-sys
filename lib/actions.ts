"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { canCreateRole, canCreateStoreInCity, canManageStore } from "@/lib/permissions";
import { NATUS_CITIES } from "@/lib/constants/cities";
import { getStoreById } from "@/lib/inventory";
import { PRODUCT_BRAND, PRODUCT_CATEGORIES } from "@/lib/constants/products";
import { uploadProductImage } from "@/lib/storage";
import type { Profile } from "@/lib/types";

const MANAGEMENT = ["directeur", "admin", "manager"] as const;
const STOCK_MANAGEMENT = ["directeur", "admin", "manager", "hub"] as const;

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
  revalidatePath("/manager/activity");
  revalidatePath("/manager/stores");
  revalidatePath("/manager/users");
  revalidatePath("/director/products");
  revalidatePath("/director/stock");
  revalidatePath("/director/activity");
  revalidatePath("/director/stores");
  revalidatePath("/director/users");
  revalidatePath("/director/hubs");
  revalidatePath("/hub");
  revalidatePath("/hub/stock");
  revalidatePath("/hub/hub-stock");
  revalidatePath("/hub/activity");
  revalidatePath("/cashier/transfers");
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

  const supabase = await createClient();

  const { data: existingProduct, error: existingError } = await supabase
    .from("products")
    .select("barcode")
    .eq("id", id)
    .maybeSingle();

  if (existingError || !existingProduct) {
    return { error: "Produit introuvable" };
  }

  const submittedBarcode = ((formData.get("barcode") as string) || "").trim();
  const barcode =
    profile.role === "directeur"
      ? submittedBarcode
      : existingProduct.barcode;

  if (!barcode) return { error: "Code-barres requis" };

  const category = parseCategory(formData.get("category"));
  if (!category) return { error: "Catégorie invalide" };

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
  const profile = await requireRole([...STOCK_MANAGEMENT]);
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
  const profile = await requireRole(["directeur", "admin", "hub"]);
  if (!profile) return { error: "Seul le directeur ou le hub stock peut ajuster le stock actuel" };

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
    if (msg.includes("gérant affecté")) {
      return { error: "Aucun gérant affecté — contactez le directeur" };
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

export async function confirmHubStockTransfer(
  transferId: string
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["cashier", "manager", "directeur", "admin"]);
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

  if (transfer.status !== "sent") {
    return { error: "Ce transfert a déjà été reçu" };
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

export async function getProductStoreStock(productId: string, storeId: string) {
  const profile = await requireRole([...STOCK_MANAGEMENT]);
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
  storeId?: string,
  loyalty?: { customerId: string; pointsToRedeem?: number }
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
    p_customer_id: loyalty?.customerId || null,
    p_points_to_redeem: loyalty?.pointsToRedeem || 0,
  });

  if (error) return { error: error.message };

  const saleId = data as string;
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

  revalidatePath("/cashier/pos");
  revalidatePath("/cashier/sales");
  revalidatePath("/manager/sales");
  revalidatePath("/manager");
  revalidatePath("/manager/loyalty");
  revalidatePath("/director/sales");
  revalidatePath("/director");
  revalidatePath("/director/loyalty");
  return { success: true, saleId: data as string };
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

export async function lookupLoyaltyCustomerByPhone(
  phone: string
): Promise<{ customer: import("@/lib/types").LoyaltyCustomer } | { error: string }> {
  const profile = await requireRole([...MANAGEMENT, "cashier"]);
  if (!profile) return { error: "Non autorisé" };

  const { getCustomerByPhone } = await import("@/lib/loyalty/customers");
  const supabase = await createClient();
  const customer = await getCustomerByPhone(supabase, phone);
  if (!customer) return { error: "Client introuvable" };
  return { customer };
}

/** Téléphone, code-barres carte (FID-…) ou QR code (NATUS:LOYALTY:…) */
export async function lookupLoyaltyCustomer(
  raw: string
): Promise<{ customer: import("@/lib/types").LoyaltyCustomer } | { error: string }> {
  const profile = await requireRole([...MANAGEMENT, "cashier"]);
  if (!profile) return { error: "Non autorisé" };

  const trimmed = raw.trim();
  if (!trimmed) return { error: "Saisie vide" };

  const { parseLoyaltyQrPayload } = await import("@/lib/loyalty/qr");
  const scanPayload = parseLoyaltyQrPayload(trimmed);
  if (scanPayload) {
    const { getCustomerByCardOrToken } = await import("@/lib/loyalty/customers");
    const supabase = await createClient();
    const customer = await getCustomerByCardOrToken(supabase, scanPayload);
    if (!customer) return { error: "Carte fidélité introuvable" };
    return { customer };
  }

  const { normalizePhone } = await import("@/lib/loyalty/phone");
  if (!normalizePhone(trimmed)) {
    return { error: "Téléphone, code-barres ou QR code invalide" };
  }

  return lookupLoyaltyCustomerByPhone(trimmed);
}

export async function lookupLoyaltyCustomerByScan(
  raw: string
): Promise<{ customer: import("@/lib/types").LoyaltyCustomer } | { error: string }> {
  const profile = await requireRole([...MANAGEMENT, "cashier"]);
  if (!profile) return { error: "Non autorisé" };

  const { parseLoyaltyQrPayload } = await import("@/lib/loyalty/qr");
  const { getCustomerByCardOrToken } = await import("@/lib/loyalty/customers");
  const identifier = parseLoyaltyQrPayload(raw);
  if (!identifier) return { error: "QR Code fidélité invalide" };

  const supabase = await createClient();
  const customer = await getCustomerByCardOrToken(supabase, identifier);
  if (!customer) return { error: "Carte fidélité introuvable" };
  return { customer };
}

export async function completeShopifyOrderSale(
  shopifyOrderId: string,
  items: { product_id: string; quantity: number }[],
  _paymentMethod: "cash" | "card" = "cash",
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

  if (order.fulfilled_at || order.sale_id) {
    return { error: "Commande déjà préparée en caisse" };
  }

  const supabase = await createClient();
  const { error: fulfillError } = await supabase.rpc("fulfill_shopify_order", {
    p_items: items,
    p_store_id: storeId || order.store_id || null,
  });

  if (fulfillError) return { error: fulfillError.message };

  const now = new Date().toISOString();

  const { resolveLivreurForReadyOrder } = await import("@/lib/shopify/assign-livreur");
  const livreurId = order.store_id
    ? await resolveLivreurForReadyOrder(order.store_id)
    : null;

  const updates: Record<string, unknown> = {
    fulfilled_at: now,
    fulfilled_by: profile.id,
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

  return { success: true, saleId: null };
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
    if (!city) {
      return { error: role === "hub" ? "Ville requise pour le hub stock" : "Ville requise pour le gérant" };
    }
    if (!canCreateStoreInCity(profile, city)) {
      return { error: "Vous ne pouvez créer ce compte que pour votre ville" };
    }
  }

  if (role === "cashier" || role === "livreur") {
    if (!storeId) {
      return { error: role === "livreur" ? "Magasin requis pour le livreur" : "Magasin requis pour le caissier" };
    }
    const store = await getStoreById(storeId);
    if (!store) return { error: "Magasin introuvable" };
    if (!canManageStore(profile, store)) {
      return { error: "Ce magasin n'est pas dans votre périmètre" };
    }
    if (role === "livreur") {
      const supabaseCheck = await createClient();
      const { data: existingLivreur } = await supabaseCheck
        .from("profiles")
        .select("id")
        .eq("role", "livreur")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .maybeSingle();
      if (existingLivreur) {
        return { error: "Ce magasin a déjà un livreur actif" };
      }
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
      city: role === "manager" || role === "hub" ? city : undefined,
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
      updates.city = city;
      updates.store_id = null;
    }

    if ((role === "cashier" || role === "livreur") && storeId) {
      updates.store_id = storeId;
      const store = await getStoreById(storeId);
      updates.city = store?.city || null;
    }

    await admin.from("profiles").update(updates).eq("id", data.user.id);

    if (role === "hub" && city) {
      await admin.rpc("auto_assign_hub_managers", {
        p_hub_user_id: data.user.id,
        p_city: city,
      });
    }
  }

  revalidateManagement();
  revalidatePath("/director/hubs");
  return { success: true };
}

export async function updateHubManagers(
  hubUserId: string,
  managerIds: string[]
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();

  const { data: hubProfile } = await supabase
    .from("profiles")
    .select("id, role, city")
    .eq("id", hubUserId)
    .eq("role", "hub")
    .maybeSingle();

  if (!hubProfile?.city) return { error: "Compte hub introuvable" };

  const { data: validManagers } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "manager")
    .eq("city", hubProfile.city)
    .in("id", managerIds);

  const validIds = new Set((validManagers || []).map((m) => m.id));
  const filtered = managerIds.filter((id) => validIds.has(id));

  const { error: deleteError } = await supabase
    .from("hub_manager_assignments")
    .delete()
    .eq("hub_user_id", hubUserId);

  if (deleteError) return { error: deleteError.message };

  if (filtered.length > 0) {
    const { error: insertError } = await supabase.from("hub_manager_assignments").insert(
      filtered.map((managerId) => ({
        hub_user_id: hubUserId,
        manager_id: managerId,
      }))
    );
    if (insertError) return { error: insertError.message };
  }

  revalidatePath("/director/hubs");
  revalidatePath("/hub");
  return { success: true };
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

  revalidatePath("/cashier/returns");
  revalidatePath("/cashier/orders");
  revalidatePath("/manager/orders");
  revalidatePath("/director/orders");
  revalidatePath("/director/hub");
  revalidatePath("/livreur/returns");

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

  if (!order.assigned_livreur_id && order.store_id) {
    const { assignOrderToStoreLivreur } = await import("@/lib/shopify/assign-livreur");
    await assignOrderToStoreLivreur(orderId, order.store_id);
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

  if (order.financial_status === "paid" || order.sale_id) {
    return { error: "Commande déjà payée en caisse" };
  }

  if (!order.fulfilled_at) {
    return { error: "Préparez la commande en caisse avant d'encaisser le COD" };
  }

  const products = await getProductCatalog();
  const mapped = shopifyOrderToSaleItems(order, products);
  if ("error" in mapped) return { error: mapped.error };

  const supabase = await createClient();
  const { data: saleId, error: saleError } = await supabase.rpc("record_cod_payment", {
    p_items: mapped.items,
    p_store_id: order.store_id || null,
  });

  if (saleError) return { error: saleError.message };
  if (!saleId) return { error: "Erreur enregistrement caisse" };

  const now = new Date().toISOString();
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

  revalidatePath("/director/orders");
  revalidatePath("/director/hub");
  revalidatePath("/manager/orders");
  revalidatePath("/cashier/orders");
  revalidatePath("/cashier/sales");
  revalidatePath("/manager/sales");
  revalidatePath("/director/sales");

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

  if ("error" in resolved) return { error: resolved.error };
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
