import { redirect } from "next/navigation";

export default function DirectorLoyaltyPage() {
  redirect("/director/clients?tab=programme");
}
