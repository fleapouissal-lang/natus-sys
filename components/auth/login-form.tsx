"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { touchSessionActivity } from "@/components/auth/session-guard";
import { signInStaff } from "@/lib/auth/sign-in";

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

    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const result = await signInStaff(normalizedEmail, submittedPassword, { isMobile });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    touchSessionActivity();
    router.push(result.redirectTo);
    router.refresh();
  }

  return (
    <div className="natus-bg-pattern natus-login relative flex min-h-screen items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <h1 className="natus-login-logo text-5xl font-semibold tracking-tight sm:text-6xl">
            Natus
          </h1>
          <p className="mt-3 text-base text-muted">
            Connectez-vous à votre espace Natus
          </p>
        </div>

        <Card className="natus-login-card border border-[#B38C4A]/20 bg-surface/95 shadow-[0_0_0_1px_rgba(179,140,74,0.08),0_12px_40px_rgba(179,140,74,0.08)] backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="on">
            <Input
              label="Email"
              name="email"
              type="email"
              inputMode="email"
              inputSize="lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="xxxxx@gmail.com"
              required
              autoComplete="username"
              className="natus-login-field"
            />
            <PasswordInput
              label="Mot de passe"
              name="password"
              inputSize="lg"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="**"
              maskWithAsterisk
              required
              autoComplete="current-password"
              className="natus-login-field"
            />

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2.5 text-sm leading-relaxed text-danger"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="natus-login-submit w-full"
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
