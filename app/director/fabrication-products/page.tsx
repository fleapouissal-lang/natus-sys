import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { isDirector } from "@/lib/permissions";
import {
  getFabricationProductsWithStock,
  getHubStoresForFabrication,
} from "@/lib/fabrication/queries";
import { FabricationProductsManager } from "@/components/fabrication/fabrication-products-manager";

function resolveHubStoreId(
  hubStores: { id: string }[],
  hubParam?: string | null
): string {
  if (hubParam && hubStores.some((s) => s.id === hubParam)) return hubParam;
  return hubStores[0]?.id || "";
}

export default async function DirectorFabricationProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ hub?: string }>;
}) {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) redirect("/login");

  const { hub: hubParam } = await searchParams;
  const hubStores = await getHubStoresForFabrication();
  const hubStoreId = resolveHubStoreId(hubStores, hubParam);
  const products = hubStoreId
    ? await getFabricationProductsWithStock(hubStoreId)
    : [];

  return (
    <FabricationProductsManager
      hubStores={hubStores}
      products={products}
      defaultHubStoreId={hubStoreId}
      canManageCatalog={isDirector(profile)}
      basePath="/director"
    />
  );
}
