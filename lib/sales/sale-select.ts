/** Select Supabase partagé pour l'historique ventes. */
export const SALE_HISTORY_SELECT =
  "*, profiles:cashier_id(full_name, email), stores(name, city), customers(full_name, card_number, phone), sale_items(id, quantity, unit_price, products(name, barcode))";
