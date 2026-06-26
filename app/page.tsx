import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getHomePath } from "@/lib/permissions";

export default async function HomePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  redirect(getHomePath(profile.role, profile));
}
