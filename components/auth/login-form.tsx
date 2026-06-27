"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { touchSessionActivity } from "@/components/auth/session-guard";
import { signInStaff } from "@/lib/auth/sign-in";

const LOGIN_HERO = {
  src: "/images/login-hero.png",
  alt: "Boutique Natus Marrakech",
} as const;

/** Résolution native — évite l'agrandissement au-delà de 576px (flou). */
const LOGIN_HERO_NATIVE_WIDTH = 576;

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

    const normalizedEmail = email.trim().toLowerCase();
    const submittedPassword = password;

    if (!normalizedEmail || !submittedPassword) {
      setError("Email et mot de passe requis");
      setLoading(false);
      return;
    }

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
    <div className="natus-login relative flex min-h-screen flex-col bg-[#FFFDF9] lg:flex-row">
      <div className="natus-login-hero relative block h-44 w-full shrink-0 sm:h-52 md:h-60 lg:hidden">
        <Image
          {...LOGIN_HERO}
          fill
          priority
          quality={100}
          unoptimized
          className="natus-login-hero__img object-cover object-center"
          sizes="100vw"
        />
      </div>

      <div className="relative z-10 flex w-full flex-1 flex-col lg:flex-row">
        <div className="natus-login-panel relative flex flex-1 items-center justify-center px-6 py-10 sm:px-12 sm:py-12 lg:px-16 xl:px-20">
          <div className="natus-login-panel__glow pointer-events-none" aria-hidden />

          <div className="relative w-full max-w-[26rem] animate-fade-in">
            <div className="mb-10">
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
              <p className="mb-6 text-sm tracking-wide text-muted">
                Identifiez-vous pour accéder à votre tableau de bord.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5" autoComplete="on">
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

            <p className="mt-10 text-[0.6875rem] uppercase tracking-[0.22em] text-muted/70">
              Cosmétiques naturels · Natus
            </p>
          </div>
        </div>

        <div
          className="natus-login-hero relative hidden min-h-screen shrink-0 lg:block"
          style={{ width: LOGIN_HERO_NATIVE_WIDTH, maxWidth: "50vw" }}
        >
          <Image
            {...LOGIN_HERO}
            fill
            priority
            quality={100}
            unoptimized
            className="natus-login-hero__img object-cover object-center"
            sizes="576px"
          />
        </div>
      </div>
    </div>
  );
}
