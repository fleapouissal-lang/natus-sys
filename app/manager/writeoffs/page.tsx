import { WriteoffsManagementPage } from "@/components/store-writeoffs/writeoffs-management-page";

export default function ManagerWriteoffsPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; store?: string; from?: string; to?: string }>;
}) {
  return <WriteoffsManagementPage searchParams={searchParams} />;
}
