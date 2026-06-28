import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { uploadWriteoffPhoto } from "@/lib/storage";
import { MAX_WRITEOFF_PHOTOS } from "@/lib/store-writeoffs/types";

export { MAX_WRITEOFF_PHOTOS };

export async function attachWriteoffPhotos(
  writeoffId: string,
  storeId: string,
  photos: File[]
): Promise<{ error?: string }> {
  if (photos.length === 0) return {};

  if (photos.length > MAX_WRITEOFF_PHOTOS) {
    return { error: `Maximum ${MAX_WRITEOFF_PHOTOS} photos par retour` };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  for (let index = 0; index < photos.length; index += 1) {
    const file = photos[index];
    const upload = await uploadWriteoffPhoto(supabase, storeId, writeoffId, file, index);
    if (upload.error || !upload.url || !upload.path) {
      return { error: upload.error || "Échec de l'envoi d'une photo" };
    }

    const { error } = await admin.from("store_product_writeoff_photos").insert({
      writeoff_id: writeoffId,
      storage_path: upload.path,
      public_url: upload.url,
      sort_order: index,
    });

    if (error) {
      return { error: error.message };
    }
  }

  return {};
}
