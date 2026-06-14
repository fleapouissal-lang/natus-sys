import { createClient } from "@/lib/supabase/server";
import type { DashboardStats } from "@/lib/types";

export async function getDashboardStats(storeId: string): Promise<DashboardStats> {
  const supabase = await createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    { count: totalProducts },
    { data: sales },
    { data: todaySales },
    { data: inventory },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("sales").select("total").eq("store_id", storeId),
    supabase
      .from("sales")
      .select("total")
      .eq("store_id", storeId)
      .gte("created_at", today.toISOString()),
    supabase
      .from("store_inventory")
      .select("stock")
      .eq("store_id", storeId),
  ]);

  const totalRevenue = sales?.reduce((sum, s) => sum + Number(s.total), 0) || 0;
  const todayRevenue =
    todaySales?.reduce((sum, s) => sum + Number(s.total), 0) || 0;
  const lowStockCount =
    inventory?.filter((row) => row.stock > 0 && row.stock < 10).length || 0;

  return {
    totalSales: sales?.length || 0,
    totalRevenue,
    totalProducts: totalProducts || 0,
    lowStockCount,
    todaySales: todaySales?.length || 0,
    todayRevenue,
  };
}
