import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPublicProduct } from "@/lib/marketing/public-product";
import { formatCurrency } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getPublicProduct(id);
  if (!product) return { title: "Produit — Natus" };
  return {
    title: `${product.name} — Natus`,
    description: product.description || `${product.name} — ${formatCurrency(product.price)}`,
  };
}

export default async function ProductStoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getPublicProduct(id);
  if (!product) notFound();

  return (
    <div className="min-h-screen bg-page px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-md overflow-hidden border border-primary/30 bg-surface shadow-sm">
        {product.image_url ? (
          <div className="relative aspect-square w-full bg-page">
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
              unoptimized
            />
          </div>
        ) : (
          <div className="flex aspect-square items-center justify-center bg-primary/5 text-sm text-muted">
            Natus
          </div>
        )}

        <div className="p-6">
          <p className="font-heading text-xs font-semibold uppercase tracking-wide text-primary">
            {product.category}
          </p>
          <h1 className="mt-2 font-heading text-2xl font-bold text-foreground">
            {product.name}
          </h1>
          {product.brand && (
            <p className="mt-1 text-sm text-muted">{product.brand}</p>
          )}
          <p className="mt-4 font-heading text-xl font-bold text-primary">
            {formatCurrency(product.price)}
          </p>
          {product.description && (
            <p className="mt-4 text-sm leading-relaxed text-muted">
              {product.description}
            </p>
          )}
          <p className="mt-6 text-xs text-muted">
            Disponible en magasin Natus — Marrakech
          </p>
        </div>
      </div>
    </div>
  );
}
