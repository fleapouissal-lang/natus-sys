import { createAdminClient } from "@/lib/supabase/admin";

export type PublicProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  brand: string | null;
  image_url: string | null;
};

export async function getPublicProduct(
  productId: string
): Promise<PublicProduct | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_public_product", {
    p_id: productId,
  });

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  const row = data[0] as PublicProduct;
  return {
    ...row,
    price: Number(row.price),
  };
}
