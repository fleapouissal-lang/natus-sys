import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function LegacyProClientInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: store } = await supabase
    .from("stores")
    .select("pro_client_token")
    .eq("pro_client_token", token)
    .maybeSingle();

  if (store?.pro_client_token) {
    redirect(`/client-pro/inscription-normale/${token}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Lien expiré</h1>
        <p className="mt-3 text-sm text-muted">
          Ce lien d&apos;invitation n&apos;est plus valide. Scannez le QR code affiché en caisse
          Natus pour vous inscrire en Client Pro.
        </p>
      </div>
    </div>
  );
}
