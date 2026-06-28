import { createAdminClient } from "@/lib/supabase/admin";
import { uploadComplaintPhoto } from "@/lib/storage";
import { normalizePhone } from "@/lib/loyalty/phone";
import type { StoreComplaintSource } from "@/lib/feedback/complaints";

export type PublicComplaintType = "web_service" | "web_order" | "web_other";

export type PublicComplaintStore = {
  id: string;
  name: string;
  city: string;
};

export type PublicComplaintStoresData = {
  cities: string[];
  storesByCity: Record<string, PublicComplaintStore[]>;
};

export async function getPublicComplaintStoresData(): Promise<PublicComplaintStoresData> {
  const admin = createAdminClient();
  const { data: stores, error } = await admin
    .from("stores")
    .select("id, name, city")
    .eq("is_active", true)
    .order("city")
    .order("name");

  if (error) {
    console.error("[public-complaints] stores:", error.message);
    return { cities: [], storesByCity: {} };
  }

  const storesByCity: Record<string, PublicComplaintStore[]> = {};
  const citySet = new Set<string>();

  for (const store of stores || []) {
    citySet.add(store.city);
    if (!storesByCity[store.city]) storesByCity[store.city] = [];
    storesByCity[store.city].push(store);
  }

  return {
    cities: [...citySet].sort((a, b) => a.localeCompare(b, "fr")),
    storesByCity,
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

async function resolveOrderContext(orderNumber: string): Promise<{
  storeId: string | null;
  shopifyOrderId: string | null;
}> {
  const admin = createAdminClient();
  const normalized = orderNumber.trim().replace(/^#/, "");
  const candidates = [`#${normalized}`, normalized, orderNumber.trim()];

  for (const candidate of [...new Set(candidates)]) {
    const { data } = await admin
      .from("shopify_orders")
      .select("id, store_id")
      .eq("order_number", candidate)
      .maybeSingle();

    if (data) {
      return {
        storeId: data.store_id,
        shopifyOrderId: data.id,
      };
    }
  }

  return { storeId: null, shopifyOrderId: null };
}

export async function submitPublicComplaint(input: {
  type: PublicComplaintType;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  message: string;
  storeId?: string | null;
  orderNumber?: string | null;
  photo?: File | null;
}): Promise<{ success: true; id: string } | { error: string }> {
  const name = input.customerName.trim();
  const email = input.customerEmail.trim();
  const phone = normalizePhone(input.customerPhone);
  const message = input.message.trim();

  if (!name) return { error: "Le nom est obligatoire" };
  if (!email || !isValidEmail(email)) return { error: "Email invalide" };
  if (!phone) return { error: "Numéro de téléphone invalide" };
  if (!message || message.length < 10) {
    return { error: "Le message doit contenir au moins 10 caractères" };
  }
  if (message.length > 5000) {
    return { error: "Le message est trop long (max 5000 caractères)" };
  }

  const admin = createAdminClient();
  let storeId: string | null = null;
  let shopifyOrderId: string | null = null;
  let orderNumber: string | null = null;
  let photoUrl: string | null = null;
  const source: StoreComplaintSource = input.type;

  if (input.type === "web_service") {
    if (!input.storeId) return { error: "Veuillez sélectionner un magasin" };

    const { data: store } = await admin
      .from("stores")
      .select("id")
      .eq("id", input.storeId)
      .eq("is_active", true)
      .maybeSingle();

    if (!store) return { error: "Magasin invalide" };
    storeId = store.id;
  }

  if (input.type === "web_order") {
    const rawOrder = input.orderNumber?.trim().replace(/^#/, "") || "";
    if (!rawOrder) return { error: "Le numéro de commande est obligatoire" };
    orderNumber = rawOrder;

    const orderContext = await resolveOrderContext(rawOrder);
    storeId = orderContext.storeId;
    shopifyOrderId = orderContext.shopifyOrderId;

    // La photo reste obligatoire pour une réclamation de commande.
    if (!input.photo) {
      return { error: "Veuillez joindre une photo du problème" };
    }
  }

  if (input.type === "web_other") {
    storeId = null;
  }

  // Photo : obligatoire pour les commandes, optionnelle pour les autres types.
  // Dès qu'une photo est jointe, on la téléverse et on la stocke afin qu'elle
  // s'affiche dans le détail de la réclamation.
  if (input.photo) {
    const baseName =
      input.type === "web_order" && orderNumber
        ? `order-${orderNumber}`
        : `${input.type}-${phone.replace(/\D/g, "")}`;

    const upload = await uploadComplaintPhoto(admin, input.photo, baseName);
    if (upload.error || !upload.url) {
      return { error: upload.error || "Échec du téléversement de la photo" };
    }
    photoUrl = upload.url;
  }

  const { data, error } = await admin
    .from("store_complaints")
    .insert({
      store_id: storeId,
      source,
      shopify_order_id: shopifyOrderId,
      customer_phone: phone,
      customer_name: name,
      customer_email: email,
      message,
      order_number: orderNumber,
      photo_url: photoUrl,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[public-complaints] insert:", error.message);
    return { error: "Impossible d'enregistrer la réclamation. Réessayez plus tard." };
  }

  return { success: true, id: data.id };
}
