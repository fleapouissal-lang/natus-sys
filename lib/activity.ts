import { createClient } from "@/lib/supabase/server";
import { getRoleLabel } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";
import type { ActivityEntry, ActivityKind, UserRole } from "@/lib/types";

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function movementKind(type: string): ActivityKind | null {
  if (type === "add") return "stock_add";
  if (type === "adjustment") return "stock_adjustment";
  return null;
}

function movementTitle(kind: ActivityKind, quantity: number, productName: string): string {
  if (kind === "stock_add") {
    return `Ajout de stock · ${productName}`;
  }
  const sign = quantity > 0 ? "+" : "";
  return `Ajustement stock · ${productName} (${sign}${quantity})`;
}

export async function getActivityLog(
  storeIds: string[],
  limit = 150
): Promise<ActivityEntry[]> {
  if (storeIds.length === 0) return [];

  const supabase = await createClient();

  const [{ data: movements }, { data: sales }] = await Promise.all([
    supabase
      .from("stock_movements")
      .select(
        "id, quantity, type, notes, created_at, store_id, products(name, barcode), stores(name, city), profiles:created_by(full_name, email, role)"
      )
      .in("store_id", storeIds)
      .in("type", ["add", "adjustment"])
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

  const entries: ActivityEntry[] = [];

  for (const row of movements || []) {
    const kind = movementKind(row.type);
    if (!kind) continue;

    const product = unwrapRelation(row.products as { name: string; barcode: string } | { name: string; barcode: string }[] | null);
    const store = unwrapRelation(row.stores as { name: string; city: string } | { name: string; city: string }[] | null);
    const actor = unwrapRelation(row.profiles as {
      full_name: string | null;
      email: string;
      role: UserRole;
    } | {
      full_name: string | null;
      email: string;
      role: UserRole;
    }[] | null);
    const qty = row.quantity as number;

    entries.push({
      id: `sm-${row.id}`,
      kind,
      created_at: row.created_at,
      store_id: row.store_id,
      store_name: store?.name ?? null,
      store_city: store?.city ?? null,
      actor_name: actor?.full_name || actor?.email || null,
      actor_role: actor?.role ?? null,
      title: movementTitle(kind, qty, product?.name || "Produit"),
      detail: row.notes || product?.barcode || null,
      quantity: qty,
      amount: null,
    });
  }

  for (const row of sales || []) {
    const store = unwrapRelation(row.stores as { name: string; city: string } | { name: string; city: string }[] | null);
    const actor = unwrapRelation(row.profiles as {
      full_name: string | null;
      email: string;
      role: UserRole;
    } | {
      full_name: string | null;
      email: string;
      role: UserRole;
    }[] | null);
    const items = (row.sale_items as { quantity: number }[]) || [];
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const payment = row.payment_method === "card" ? "Carte" : "Espèces";

    entries.push({
      id: `sale-${row.id}`,
      kind: "sale",
      created_at: row.created_at,
      store_id: row.store_id,
      store_name: store?.name ?? null,
      store_city: store?.city ?? null,
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
