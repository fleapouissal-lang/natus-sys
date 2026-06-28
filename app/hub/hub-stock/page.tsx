import { redirect } from "next/navigation";

export default function HubWarehousePage() {
  redirect("/hub/stock-transfers?tab=new");
}
