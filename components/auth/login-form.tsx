"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { touchSessionActivity } from "@/components/auth/session-guard";
import { resolveStaffHomePath } from "@/lib/cashier/access";

function getLoginErrorMessage(code?: string, message?: string): string {
  switch (code) {
    case "invalid_credentials":
    case "invalid_grant":
      return "Email ou mot de passe incorrect";
    case "email_not_confirmed":
      return "Veuillez confirmer votre email avant de vous connecter";
    case "too_many_requests":
      return "Trop de tentatives, réessayez dans quelques minutes";
    default:
      if (message?.toLowerCase().includes("invalid login")) {
        return "Email ou mot de passe incorrect";
      }
      return message || "Email ou mot de passe incorrect";
  }
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const normalizedEmail = String(formData.get("email") ?? email)
      .trim()
      .toLowerCase();
    const submittedPassword = String(formData.get("password") ?? password);

    if (!normalizedEmail || !submittedPassword) {
      setError("Veuillez saisir votre email et mot de passe");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: submittedPassword,
    });

    if (authError) {
      if (process.env.NODE_ENV === "development") {
        console.error("Login error:", authError.message, authError.code);
      }
      setError(getLoginErrorMessage(authError.code, authError.message));
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_active, is_store_pos, store_id")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setError("Profil introuvable. Contactez un administrateur.");
      setLoading(false);
      return;
    }

    if (!profile.is_active) {
      await supabase.auth.signOut();
      setError("Votre compte a été désactivé");
      setLoading(false);
      return;
    }

    touchSessionActivity();

    router.push(await resolveStaffHomePath(supabase, profile));
    router.refresh();
  }

  return (
    <div className="natus-bg-pattern relative flex min-h-screen items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <h1 className="text-5xl font-semibold tracking-tight text-[#B38C4A] sm:text-6xl">Natus</h1>
          <p className="mt-3 text-base text-muted">
            Connectez-vous à votre espace de caisse
          </p>
        </div>

        <Card className="border border-[#B38C4A]/15 bg-surface/95 shadow-[0_0_0_1px_rgba(179,140,74,0.08),0_12px_40px_rgba(179,140,74,0.06)] backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="on">
            <Input
              label="Email"
              name="email"
              type="email"
              inputMode="email"
              inputSize="lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="manager@natus.ma"
              required
              autoComplete="username"
            />
            <PasswordInput
              label="Mot de passe"
              name="password"
              inputSize="lg"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
              autoComplete="current-password"
            />

            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-[#B38C4A] text-black hover:brightness-95"
              size="lg"
              loading={loading}
            >
              Se connecter
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
