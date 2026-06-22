import Link from "next/link";
import { ArrowLeft, Home, LogIn } from "lucide-react";
import { Card } from "@/components/ui/card";
import { NATUS_WEBSITE_URL } from "@/lib/marketing/public-reviews";
import { cn } from "@/lib/utils";

const actionLinkClass = cn(
  "inline-flex w-full items-center justify-center gap-2 px-6 py-3 text-base font-medium transition-colors sm:w-auto"
);

export default function NotFound() {
  return (
    <div className="natus-bg-pattern relative flex min-h-screen flex-col items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-lg animate-fade-in text-center">
        <p className="font-heading text-8xl font-bold leading-none text-primary/25 sm:text-9xl">
          404
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#B38C4A] sm:text-4xl">
          Natus
        </h1>
        <p className="mt-3 text-base text-muted">Page introuvable</p>

        <Card className="mt-8 border border-primary/15 bg-surface/95 px-6 py-8 text-left shadow-[0_0_0_1px_rgba(179,140,74,0.08),0_12px_40px_rgba(179,140,74,0.06)] backdrop-blur-sm">
          <p className="text-sm leading-relaxed text-foreground">
            L&apos;adresse que vous avez saisie n&apos;existe pas, a été déplacée ou vous n&apos;avez
            pas l&apos;accès à cette page.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className={cn(
                actionLinkClass,
                "bg-[#B38C4A] text-black shadow-sm hover:brightness-95"
              )}
            >
              <Home className="h-4 w-4" />
              Accueil
            </Link>
            <Link
              href="/login"
              className={cn(
                actionLinkClass,
                "border border-primary bg-champagne text-black hover:brightness-95"
              )}
            >
              <LogIn className="h-4 w-4" />
              Connexion
            </Link>
          </div>

          <div className="mt-6 border-t border-dashed border-border pt-5 text-center">
            <a
              href={NATUS_WEBSITE_URL}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au site natusmarrakech.com
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
