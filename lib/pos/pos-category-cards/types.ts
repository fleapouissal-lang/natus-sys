export const POS_MIN_CATEGORY_PRODUCTS = 1;

export type PosCategoryCardConfig = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  sortOrder: number;
  minProductCount: number;
};

export type PosCategoryCardRow = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
  min_product_count: number;
};
