import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatShopifyStatus } from "@/lib/utils";
import type { ShopifyOrder } from "@/lib/types";

function statusVariant(
  status: string | null
): "default" | "success" | "warning" | "danger" {
  if (!status) return "default";
  const s = status.toLowerCase();
  if (s === "paid" || s === "fulfilled" || s === "closed") return "success";
  if (s === "cancelled" || s === "refunded") return "danger";
  if (s === "pending" || s === "unfulfilled" || s === "open") return "warning";
  return "default";
}

export function ShopifyOrdersList({
  orders,
  scopeLabel,
  showStore = true,
}: {
  orders: ShopifyOrder[];
  scopeLabel: string;
  showStore?: boolean;
}) {
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-muted">Commandes en ligne</p>
          <p className="mt-1 text-2xl font-bold">{orders.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Montant total</p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
        </Card>
      </div>

      <Card padding={false}>
        <div className="p-6">
          <CardHeader
            title="Commandes en ligne"
            description={scopeLabel}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border bg-primary-light/50">
                <th className="px-6 py-3 text-left font-medium text-muted">N°</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Date</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Client</th>
                {showStore && (
                  <th className="px-6 py-3 text-left font-medium text-muted">Magasin</th>
                )}
                <th className="px-6 py-3 text-left font-medium text-muted">Ville</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Adresse</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Statut</th>
                <th className="px-6 py-3 text-right font-medium text-muted">Montant</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-border">
                  <td className="px-6 py-4 font-medium">{order.order_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {order.shopify_created_at
                      ? formatDate(order.shopify_created_at)
                      : formatDate(order.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p>{order.customer_name || "—"}</p>
                      {order.customer_phone && (
                        <p className="text-xs text-muted">{order.customer_phone}</p>
                      )}
                    </div>
                  </td>
                  {showStore && (
                    <td className="px-6 py-4">
                      {(order.stores as { name: string } | null)?.name || "—"}
                    </td>
                  )}
                  <td className="px-6 py-4">{order.city}</td>
                  <td className="px-6 py-4 max-w-[200px] truncate" title={order.shipping_address || ""}>
                    {order.shipping_address || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={statusVariant(order.financial_status)}>
                        {formatShopifyStatus(order.financial_status)}
                      </Badge>
                      {order.fulfillment_status && (
                        <Badge variant={statusVariant(order.fulfillment_status)}>
                          {formatShopifyStatus(order.fulfillment_status)}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    {formatCurrency(order.total)}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td
                    colSpan={showStore ? 8 : 7}
                    className="px-6 py-12 text-center text-muted"
                  >
                    Aucune commande en ligne pour cette sélection
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
