import { createClient } from "@/lib/supabase/server";
import { getRoleLabel } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";
import type { ActivityEntry, ActivityKind, UserRole } from "@/lib/types";

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function movementKind(type: string, quantity: number): ActivityKind | null {
  if (type === "add") return "stock_add";
  if (type === "adjustment") return "stock_adjustment";
  if (type === "transfer") {
    return quantity > 0 ? "stock_transfer_in" : "stock_transfer_out";
  }
  return null;
}

function movementTitle(
  kind: ActivityKind,
  quantity: number,
  productName: string,
  relatedStoreName: string | null
): string {
  if (kind === "stock_add") {
    return `Ajout de stock · ${productName}`;
  }
  if (kind === "stock_adjustment") {
    const sign = quantity > 0 ? "+" : "";
    return `Ajustement stock · ${productName} (${sign}${quantity})`;
  }
  if (kind === "stock_transfer_in") {
    return `Réception stock · ${productName}`;
  }
  if (kind === "stock_transfer_out") {
    return `Envoi stock · ${productName}`;
  }
  return productName;
}

function movementDetail(
  kind: ActivityKind,
  notes: string | null,
  barcode: string | null,
  relatedStoreName: string | null
): string | null {
  if (kind === "stock_transfer_in" && relatedStoreName) {
    return `Depuis ${relatedStoreName}${notes ? ` · ${notes}` : ""}`;
  }
  if (kind === "stock_transfer_out" && relatedStoreName) {
    return `Vers ${relatedStoreName}${notes ? ` · ${notes}` : ""}`;
  }
  return notes || barcode || null;
}

export async function getActivityLog(
  storeIds: string[],
  limit = 150
): Promise<ActivityEntry[]> {
  if (storeIds.length === 0) return [];

  const supabase = await createClient();

  const [{ data: movements, error: movementsError }, { data: sales, error: salesError }] =
    await Promise.all([
      supabase
        .from("stock_movements")
        .select(
          "id, quantity, type, notes, created_at, store_id, related_store_id, products(name, barcode), profiles:created_by(full_name, email, role)"
        )
        .in("store_id", storeIds)
        .in("type", ["add", "adjustment", "transfer"])
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("sales")
        .select(
          "id, total, payment_method, created_at, store_id, profiles:cashier_id(full_name, email, role), stores(name, city), sale_items(quantity)"
        )
        .in("store_id", storeIds)
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

  if (movementsError) {
    console.error("getActivityLog movements:", movementsError.message);
  }
  if (salesError) {
    console.error("getActivityLog sales:", salesError.message);
  }

  const storeNameById = new Map<string, { name: string; city: string }>();
  const allStoreIds = [
    ...new Set(
      (movements || []).flatMap((row) =>
        [row.store_id as string | null, row.related_store_id as string | null].filter(
          (id): id is string => Boolean(id)
        )
      )
    ),
  ];

  if (allStoreIds.length > 0) {
    const { data: storeRows } = await supabase
      .from("stores")
      .select("id, name, city")
      .in("id", allStoreIds);
    for (const store of storeRows || []) {
      storeNameById.set(store.id, { name: store.name, city: store.city });
    }
  }

  const entries: ActivityEntry[] = [];

  for (const row of movements || []) {
    const qty = row.quantity as number;
    const kind = movementKind(row.type, qty);
    if (!kind) continue;

    const product = unwrapRelation(
      row.products as
        | { name: string; barcode: string }
        | { name: string; barcode: string }[]
        | null
    );
    const store = row.store_id ? storeNameById.get(row.store_id as string) : undefined;
    const relatedStoreName =
      (row.related_store_id && storeNameById.get(row.related_store_id as string)?.name) ||
      null;
    const actor = unwrapRelation(
      row.profiles as
        | {
            full_name: string | null;
            email: string;
            role: UserRole;
          }
        | {
            full_name: string | null;
            email: string;
            role: UserRole;
          }[]
        | null
    );

    entries.push({
      id: `sm-${row.id}`,
      kind,
      created_at: row.created_at,
      store_id: row.store_id,
      store_name: store?.name ?? null,
      store_city: store?.city ?? null,
      related_store_name: relatedStoreName,
      actor_name: actor?.full_name || actor?.email || null,
      actor_role: actor?.role ?? null,
      title: movementTitle(kind, qty, product?.name || "Produit", relatedStoreName),
      detail: movementDetail(kind, row.notes, product?.barcode || null, relatedStoreName),
      quantity: qty,
      amount: null,
    });
  }

  for (const row of sales || []) {
    const store = unwrapRelation(
      row.stores as
        | { name: string; city: string }
        | { name: string; city: string }[]
        | null
    );
    const actor = unwrapRelation(
      row.profiles as
        | {
            full_name: string | null;
            email: string;
            role: UserRole;
          }
        | {
            full_name: string | null;
            email: string;
            role: UserRole;
          }[]
        | null
    );
    const items = (row.sale_items as { quantity: number }[]) || [];
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const payment = row.payment_method === "card" ? "TPE" : "Espèces";

    entries.push({
      id: `sale-${row.id}`,
      kind: "sale",
      created_at: row.created_at,
      store_id: row.store_id,
      store_name: store?.name ?? null,
      store_city: store?.city ?? null,
      related_store_name: null,
      actor_name: actor?.full_name || actor?.email || null,
      actor_role: actor?.role ?? null,
      title: `Vente · ${formatCurrency(Number(row.total))}`,
      detail: `${itemCount} article(s) · ${payment}`,
      quantity: -itemCount,
      amount: Number(row.total),
    });
  }

  entries.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return entries.slice(0, limit);
}
