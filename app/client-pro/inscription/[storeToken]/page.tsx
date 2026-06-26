import { redirect } from "next/navigation";

export default async function LegacyProClientInscriptionPage({
  params,
}: {
  params: Promise<{ storeToken: string }>;
}) {
  const { storeToken } = await params;
  redirect(`/client-pro/inscription-normale/${storeToken}`);
}
