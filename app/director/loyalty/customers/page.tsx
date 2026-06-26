import { redirect } from "next/navigation";

export default function DirectorLoyaltyCustomersRedirectPage() {
  redirect("/director/clients?tab=normal");
}
