import type { Metadata } from "next";
import { PublicComplaintForm } from "@/components/feedback/public-complaint-form";
import { getPublicComplaintStoresData } from "@/lib/feedback/public-complaints";
import { NATUS_WEBSITE_URL } from "@/lib/marketing/public-reviews";

export const metadata: Metadata = {
  title: "Réclamation client — Natus",
  description:
    "Formulaire de réclamation Natus Cosmétiques : service en magasin, commande en ligne ou autre demande.",
  robots: { index: true, follow: true },
};

export default async function ReclamationPage() {
  const storesData = await getPublicComplaintStoresData();

  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-primary/20 bg-surface px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <a
            href={NATUS_WEBSITE_URL}
            className="font-heading text-lg font-bold tracking-wide text-primary"
          >
            NATUS
          </a>
          <a
            href={NATUS_WEBSITE_URL}
            className="text-sm text-muted hover:text-primary"
          >
            Retour au site
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
            Nous contacter
          </h1>
          <p className="mt-3 text-sm text-muted sm:text-base">
            Une insatisfaction en magasin, un souci avec votre commande ou une autre demande ?
            Remplissez le formulaire ci-dessous — votre message sera transmis à l&apos;équipe
            concernée.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
          <PublicComplaintForm storesData={storesData} />
        </div>
      </main>
    </div>
  );
}
