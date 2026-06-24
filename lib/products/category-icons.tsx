import {
  Sparkles,
  Palette,
  Droplets,
  Flower2,
  Heart,
  Scissors,
  Gift,
  Package,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getProductCategories } from "@/lib/products/product-utils";
import type { Product } from "@/lib/types";

export const PRODUCT_CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Soin visage": Sparkles,
  Maquillage: Palette,
  Nettoyage: Droplets,
  Parfum: Flower2,
  Corps: Heart,
  Cheveux: Scissors,
  Accessoires: Gift,
};

export function getProductCategoryIcon(category: string): LucideIcon {
  return PRODUCT_CATEGORY_ICONS[category] ?? Package;
}

export function ProductCategoryIcon({
  product,
  className,
  iconClassName,
}: {
  product: Pick<Product, "category" | "categories">;
  className?: string;
  iconClassName?: string;
}) {
  const categories = getProductCategories(product as Product);
  const Icon = getProductCategoryIcon(categories[0] ?? "");

  return (
    <span
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
        "border border-[#B38C4A]/25 bg-gradient-to-br from-[#FAF6EF] to-[#F0E8DA]",
        className
      )}
      aria-hidden
    >
      <Icon className={cn("h-3.5 w-3.5 text-[#8B6914]", iconClassName)} />
    </span>
  );
}
