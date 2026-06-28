import { redirect } from "next/navigation";

export default async function HubOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.created) query.set("created", params.created);
  if (params.tab) query.set("tab", params.tab);
  const suffix = query.toString();
  redirect(suffix ? `/hub/stock-transfers?${suffix}` : "/hub/stock-transfers");
}
