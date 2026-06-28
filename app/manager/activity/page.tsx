import { redirect } from "next/navigation";

export default function ManagerActivityRedirectPage() {
  redirect("/manager/history");
}
