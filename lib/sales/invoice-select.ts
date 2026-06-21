import { SALE_HISTORY_SELECT } from "@/lib/sales/sale-select";

/** Select partagé pour la liste et le détail des factures. */
export const INVOICE_SALE_SELECT =
  `${SALE_HISTORY_SELECT}, shopify_orders:shopify_order_id(order_number)`;
