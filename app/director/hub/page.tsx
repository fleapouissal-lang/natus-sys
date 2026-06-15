import Link from "next/link";
import { redirect } from "next/navigation";
import { Warehouse, ArrowRightLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { isDirector } from "@/lib/permissions";
import {
  getActiveStores,
  getProductCatalog,
  getHubStore,
  getOrderTransferTargets,
} from "@/lib/inventory";
import { getShopifyOrders } from "@/lib/orders";
import { ShopifyOrdersManager } from "@/components/orders/shopify-orders-manager";
import { ShopifySyncButton } from "@/components/orders/shopify-sync-button";
import { cn } from "@/lib/utils";

export default async function DirectorHubPage() {
  const profile = await getCurrentProfile();
  if (!profile || !isDirector(profile)) redirect("/login");

  const hubStore = await getHubStore();
  if (!hubStore) {
    return (
      <div className="animate-fade-in space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Hub stock</h1>
        <p className="text-muted">Aucun magasin hub configuré.</p>
      </div>
    );
  }

  const orders = await getShopifyOrders(profile, { storeId: hubStore.id });
  const products = await getProductCatalog();
  const transferTargets = await getOrderTransferTargets(hubStore.id);
  const casablancaStores = (await getActiveStores("Casablanca")).filter(
    (s) => !s.is_hub
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hub stock</h1>
          <p className="mt-1 text-muted">
            {hubStore.name} — {hubStore.city}
            {hubStore.address ? ` · ${hubStore.address}` : ""}
          </p>
          <p className="mt-2 text-sm text-muted">
            Commandes transférées depuis les magasins pour préparation centralisée
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/director/stock?store=${hubStore.id}`}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-md border border-primary bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-primary-light"
            )}
          >
            <Warehouse className="h-4 w-4" />
            Stock hub
          </Link>
          <ShopifySyncButton />
        </div>
      </div>

      {casablancaStores.length > 0 && (
        <p className="text-sm text-muted">
          <ArrowRightLeft className="mr-1 inline h-4 w-4 align-text-bottom text-primary" />
          Transfert possible vers :{" "}
          {casablancaStores.map((s) => s.name).join(", ")}
        </p>
      )}

      <ShopifyOrdersManager
        orders={orders}
        scopeLabel={`Hub — ${hubStore.name}`}
        showStore={false}
        showTransferOrigin
        editable
        products={products}
        enableOrderTransfer
        transferTargets={transferTargets}
        transferProfile={profile}
      />
    </div>
  );
}
