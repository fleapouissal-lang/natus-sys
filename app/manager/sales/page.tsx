import { redirect } from "next/navigation";

export default function ManagerSalesRedirectPage() {
  redirect("/manager/history?tab=sales");
}
