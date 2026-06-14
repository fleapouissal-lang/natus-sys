import Image from "next/image";
import { cn } from "@/lib/utils";
import { getProductImageUrl } from "@/lib/product-image";
import type { Product } from "@/lib/types";

export function ProductImage({
  product,
  size = "md",
  className,
}: {
  product: Pick<Product, "image_url" | "category" | "name">;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = { xs: 48, sm: 64, md: 160, lg: 240 };
  const px = sizes[size];
  const src = getProductImageUrl(product);

  return (
    <div
      className={cn(
        "relative overflow-hidden border border-border bg-surface",
        className
      )}
      style={className?.includes("!h-full") ? undefined : { width: px, height: px }}
    >
      <Image
        src={src}
        alt={product.name}
        fill
        className="object-cover"
        unoptimized
      />
    </div>
  );
}
