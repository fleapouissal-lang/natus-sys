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
        <div className="natus-login-mobile-luxe lg:hidden">
          <div className="natus-login-mobile-luxe__inner animate-fade-in">
            <header className="natus-login-mobile-luxe__brand">
              <p className="natus-login-mobile-luxe__eyebrow">Espace professionnel</p>
              <h1 className="natus-login-mobile-luxe__title">Natus</h1>
              <div className="natus-login-mobile-luxe__ornament" aria-hidden>
                <span />
                <span className="natus-login-mobile-luxe__ornament-diamond" />
                <span />
              </div>
              <p className="natus-login-mobile-luxe__tagline">
                L&apos;art du soin, au cœur de votre boutique
              </p>
            </header>

            <div className="natus-login-mobile-luxe__panel">
              <form
                method="post"
                action="/login"
                onSubmit={handleSubmit}
                className="natus-login-mobile-luxe__form space-y-5"
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
                  className="natus-login-submit mt-1 w-full shadow-none"
                  size="lg"
                  loading={loading}
                >
                  Se connecter
                </Button>
              </form>
            </div>

            <p className="natus-login-mobile-luxe__footer">Cosmétiques naturels · Marrakech</p>
          </div>
        </div>

        <div className="natus-login-panel relative hidden w-full flex-1 flex-col lg:flex lg:min-h-screen lg:w-1/2 lg:justify-center lg:px-16 lg:py-12 lg:pt-12 xl:px-20">
          <div className="natus-login-panel__glow pointer-events-none" aria-hidden />

          <div className="mx-auto w-full max-w-[26rem] animate-fade-in lg:mx-0">
            <div className="mb-8">
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
              <p className="mb-6 text-sm tracking-[0.02em] text-muted">
                Identifiez-vous pour accéder à votre tableau de bord.
              </p>
              <form
                method="post"
                action="/login"
                onSubmit={handleSubmit}
                className="space-y-5"
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
                  className="natus-login-submit mt-2 w-full shadow-none"
                  size="lg"
                  loading={loading}
                >
                  Se connecter
                </Button>
              </form>
            </div>

            <p className="mt-10 text-[0.6875rem] uppercase tracking-[0.24em] text-muted/70">
              Cosmétiques naturels · Natus
            </p>
          </div>
        </div>

        <div className="natus-login-hero relative hidden min-h-screen shrink-0 lg:block lg:w-1/2">
          <LoginHeroImage />
        </div>
      </div>
    </div>
  );
}
