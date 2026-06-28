import { redirect } from "next/navigation";

export default function CashierSalesRedirectPage() {
  redirect("/cashier/history");
}
