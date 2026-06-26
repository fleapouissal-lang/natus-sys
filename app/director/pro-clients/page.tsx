import { redirect } from "next/navigation";

export default function DirectorProClientsRedirectPage() {
  redirect("/director/clients?tab=pro");
}
