import { redirect } from "next/navigation";

export default function ManagerHubOrdersPage() {
  redirect("/manager/stock-transfers/received");
}
