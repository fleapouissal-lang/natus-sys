import { redirect } from "next/navigation";

export default function DirectorSalesPage() {
  redirect("/director/history?tab=sales");
}
