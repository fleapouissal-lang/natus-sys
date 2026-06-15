import Image from "next/image";
import { cn } from "@/lib/utils";
import { getProductImageUrl } from "@/lib/product-image";
import type { Product } from "@/lib/types";

export function ProductImage({
  product,
  size = "md",
  strip = false,
  className,
}: {
  product: Pick<Product, "image_url" | "category" | "name">;
  size?: "xs" | "sm" | "cart" | "md" | "lg";
  strip?: boolean;
  className?: string;
}) {
  const sizes = { xs: 48, sm: 64, cart: 84, md: 160, lg: 240 };
  const px = sizes[size];
  const src = getProductImageUrl(product);

  if (strip) {
    return (
      <div
        className={cn(
          "natus-cart-strip relative w-[7.5rem] shrink-0 self-stretch overflow-hidden bg-page",
          className
        )}
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
