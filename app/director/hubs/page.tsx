import { redirect } from "next/navigation";

export default function DirectorHubsPage() {
  redirect("/director/stores?tab=hubs");
}
