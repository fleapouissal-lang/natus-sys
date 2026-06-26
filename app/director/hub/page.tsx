import { redirect } from "next/navigation";

export default async function DirectorHubStockRedirect({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const params = await searchParams;
  const query = params.store ? `?store=${encodeURIComponent(params.store)}` : "";
  redirect(`/director/stock${query}`);
}
