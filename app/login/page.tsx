import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getHomePath } from "@/lib/permissions";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const profile = await getCurrentProfile();
  if (profile) {
    redirect(getHomePath(profile.role));
  }

  return <LoginForm />;
}
