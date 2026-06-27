import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { resolveStaffHomePath } from "@/lib/cashier/access";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/login-form";
import type { UserRole } from "@/lib/types";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; password?: string }>;
}) {
  const { email, password } = await searchParams;
  if (email || password) {
    redirect("/login");
  }

  const profile = await getCurrentProfile();
  if (profile) {
    const supabase = await createClient();
    redirect(
      await resolveStaffHomePath(supabase, {
        ...profile,
        role: profile.role as UserRole,
      })
    );
  }

  return <LoginForm />;
}
