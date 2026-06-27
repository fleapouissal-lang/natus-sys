import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { WriteoffsManagementPage } from "@/components/store-writeoffs/writeoffs-management-page";

export default async function DirectorWriteoffsPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; store?: string; from?: string; to?: string }>;
}) {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) redirect("/login");

  return <WriteoffsManagementPage searchParams={searchParams} />;
}
