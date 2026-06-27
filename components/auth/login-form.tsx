"use client";

import { useEffect, useState } from "react";
import { LoginHeroImage, LOGIN_HERO_SRC } from "@/components/auth/login-hero-image";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { signInStaff } from "@/lib/auth/sign-in";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("email") || params.has("password")) {
      window.history.replaceState(null, "", "/login");
    }
  }, []);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = LOGIN_HERO_SRC;
    link.type = "image/png";
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    const submittedPassword = password;

    if (!normalizedEmail || !submittedPassword) {
      setError("Email et mot de passe requis");
      setLoading(false);
      return;
    }

    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    const result = await signInStaff(normalizedEmail, submittedPassword, { isMobile });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="natus-login relative min-h-[100dvh] lg:flex lg:min-h-screen lg:flex-row lg:bg-[#FFFDF9]">
      <div className="natus-login-mobile-bg pointer-events-none lg:hidden" aria-hidden>
        <LoginHeroImage />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] w-full flex-col lg:min-h-screen lg:flex-row">
        <div className="natus-login-panel relative flex w-full flex-1 flex-col px-0 pt-[max(2.25rem,env(safe-area-inset-top))] lg:min-h-screen lg:w-1/2 lg:justify-center lg:px-16 lg:py-12 lg:pt-12 xl:px-20">
          <div className="natus-login-panel__glow pointer-events-none hidden lg:block" aria-hidden />

          <div className="natus-login-mobile-brand px-6 sm:px-8 lg:hidden">
            <p className="natus-login-eyebrow mb-2.5 text-[0.625rem] font-medium uppercase tracking-[0.32em] text-[#e8d5a8]/90">
              Espace professionnel
            </p>
            <h1 className="font-heading text-[3.15rem] font-normal leading-none tracking-[0.06em] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.55)]">
              Natus
            </h1>
            <div className="natus-login-mobile-brand-line mt-4 h-px w-12" aria-hidden />
          </div>

          <div className="natus-login-mobile-spacer flex-1 lg:hidden" aria-hidden />

          <div className="natus-login-mobile-card relative mx-auto w-full max-w-[22.5rem] animate-fade-in px-5 sm:max-w-[24rem] lg:mx-0 lg:max-w-[26rem] lg:bg-transparent lg:p-0 lg:shadow-none">
            <div className="natus-login-mobile-card-accent lg:hidden" aria-hidden />

            <div className="mb-8 hidden lg:block">
              <p className="natus-login-eyebrow mb-5 text-[0.6875rem] font-medium uppercase tracking-[0.28em] text-primary/80">
                Espace professionnel
              </p>
              <h1 className="natus-login-logo font-heading text-[3.25rem] font-normal leading-none tracking-[0.04em] sm:text-[3.75rem]">
                Natus
              </h1>
              <div className="natus-login-divider my-6 h-px w-16" aria-hidden />
              <p className="max-w-[18rem] font-heading text-[1.125rem] leading-snug text-foreground/88 sm:text-xl">
                L&apos;art du soin,
                <span className="block text-muted">au cœur de votre boutique.</span>
              </p>
            </div>

            <div className="natus-login-form-shell">
              <p className="mb-5 text-sm tracking-[0.02em] text-white/78 lg:mb-6 lg:text-muted">
                <span className="lg:hidden">Connectez-vous à votre espace professionnel.</span>
                <span className="hidden lg:inline">
                  Identifiez-vous pour accéder à votre tableau de bord.
                </span>
              </p>

              <form
                method="post"
                action="/login"
                onSubmit={handleSubmit}
                className="space-y-4 lg:space-y-5"
                autoComplete="on"
                noValidate
              >
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  inputMode="email"
                  inputSize="lg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
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
                  placeholder="Votre mot de passe"
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
                  variant="ghost"
                  className="natus-login-submit mt-1 w-full shadow-none lg:mt-2"
                  size="lg"
                  loading={loading}
                >
                  Se connecter
                </Button>
              </form>
            </div>

            <p className="mt-6 text-center text-[0.625rem] uppercase tracking-[0.24em] text-white/45 lg:mt-10 lg:text-left lg:text-[0.6875rem] lg:text-muted/70">
              Cosmétiques naturels · Natus
            </p>
          </div>

          <div className="natus-login-mobile-safe lg:hidden" aria-hidden />
        </div>

        <div className="natus-login-hero relative hidden min-h-screen shrink-0 lg:block lg:w-1/2">
          <LoginHeroImage />
        </div>
      </div>
    </div>
  );
}
