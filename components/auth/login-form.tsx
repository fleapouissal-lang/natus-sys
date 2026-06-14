"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { getHomePath } from "@/lib/permissions";

function getLoginErrorMessage(code?: string): string {
  switch (code) {
    case "invalid_credentials":
      return "Email ou mot de passe incorrect";
    case "email_not_confirmed":
      return "Veuillez confirmer votre email avant de vous connecter";
    case "too_many_requests":
      return "Trop de tentatives, réessayez dans quelques minutes";
    default:
      return "Email ou mot de passe incorrect";
  }
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const normalizedEmail = email.trim().toLowerCase();

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (authError) {
      setError(getLoginErrorMessage(authError.code));
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_active")
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

    router.push(getHomePath(profile.role as "directeur" | "manager" | "cashier"));
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" className="mb-6" />
          <p className="text-muted">
            Connectez-vous à votre espace de caisse
          </p>
        </div>

        <Card className="border-border/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="manager@natus.ma"
              required
              autoComplete="email"
            />
            <PasswordInput
              label="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />

            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Se connecter
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
