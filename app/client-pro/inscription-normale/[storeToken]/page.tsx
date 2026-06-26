import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProClientRegistrationStore } from "@/lib/pro-client/invites";
import { ProClientRegistrationForm } from "@/components/pro-client/pro-client-registration-form";
import { NATUS_WEBSITE_URL } from "@/lib/marketing/public-reviews";

export const metadata: Metadata = {
  title: "Inscription normale Client Pro — Natus",
  description: "Formulaire d'inscription normale Client Pro Natus Cosmétiques",
  robots: { index: false, follow: false },
};

export default async function ProClientStoreRegistrationPage({
  params,
}: {
  params: Promise<{ storeToken: string }>;
}) {
  const { storeToken } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(storeToken)) {
    notFound();
  }

  const store = await getProClientRegistrationStore(storeToken);

  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-primary/20 bg-surface px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
          <a
            href={NATUS_WEBSITE_URL}
            className="font-heading text-lg font-bold tracking-wide text-primary"
          >
            NATUS
          </a>
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
            Inscription normale
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-3xl font-bold text-foreground">Inscription normale</h1>
          <p className="mt-3 text-sm text-muted">
            Lien permanent sans expiration · le magasin peut créer plusieurs comptes, ou un client
            peut s&apos;inscrire sur plusieurs magasins.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
          {store.status === "open" ? (
            <ProClientRegistrationForm storeToken={storeToken} storeName={store.storeName} />
          ) : (
            <div className="space-y-3 text-center text-sm text-muted">
              <p className="font-medium text-foreground">Lien invalide</p>
              <p>Scannez le QR code affiché en caisse Natus pour accéder au formulaire.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
