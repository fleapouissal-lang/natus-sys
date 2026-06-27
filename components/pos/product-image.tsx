"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  getProductImageFallbackUrl,
  getProductImageUrl,
  type ProductImageSource,
} from "@/lib/product-image";

function ProductPlaceholder({
  className,
  imgClassName,
}: {
  className?: string;
  imgClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-[#E8E8E8]",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-natus.svg"
        alt=""
        aria-hidden
        className={cn("h-[52%] w-[52%] max-h-28 max-w-28 object-contain", imgClassName)}
      />
    </div>
  );
}

export function ProductImage({
  product,
  parent,
  size = "md",
  fill = false,
  strip = false,
  className,
  imgClassName,
}: {
  product: ProductImageSource;
  parent?: ProductImageSource | null;
  size?: "xs" | "sm" | "cart" | "md" | "lg";
  fill?: boolean;
  strip?: boolean;
  className?: string;
  imgClassName?: string;
}) {
  const sizes = { xs: 48, sm: 64, cart: 84, md: 160, lg: 240 };
  const px = sizes[size];
  const primarySrc = useMemo(
    () => getProductImageUrl(product, { parent }),
    [product, parent]
  );
  const [src, setSrc] = useState<string | null>(primarySrc);
  const [showPlaceholder, setShowPlaceholder] = useState(primarySrc === null);

  useEffect(() => {
    setSrc(primarySrc);
    setShowPlaceholder(primarySrc === null);
  }, [primarySrc]);

  function handleError() {
    const fallback = getProductImageFallbackUrl(product, {
      parent,
      failedUrl: src ?? undefined,
    });
    if (fallback && fallback !== src) {
      setSrc(fallback);
      setShowPlaceholder(false);
      return;
    }
    setShowPlaceholder(true);
  }

  const content = showPlaceholder ? (
    <ProductPlaceholder imgClassName={imgClassName} />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src!}
      alt={product.name}
      onError={handleError}
      loading={fill ? "eager" : "lazy"}
      decoding="async"
      className={cn("h-full w-full object-cover", imgClassName)}
    />
  );

  if (strip) {
    return (
      <div
        className={cn(
          "natus-cart-strip relative w-[7.5rem] shrink-0 self-stretch overflow-hidden bg-page",
          className
        )}
      >
        {content}
      </div>
    );
  }

  if (fill) {
    return (
      <div className={cn("absolute inset-0 overflow-hidden", className)}>
        {content}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg border border-[#B38C4A]/15 bg-[#FAF6EF]/40",
        className
      )}
      style={className?.includes("!h-full") ? undefined : { width: px, height: px }}
    >
      {content}
    </div>
  );
}
