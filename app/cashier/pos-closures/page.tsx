import { redirect } from "next/navigation";

export default function CashierPosClosuresRedirectPage() {
  redirect("/cashier/history?tab=closures");
}
