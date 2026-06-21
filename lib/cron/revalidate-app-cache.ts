import { revalidatePath } from "next/cache";

const APP_PATHS = [
  "/",
  "/cashier/pos",
  "/cashier/orders",
  "/cashier/sales",
  "/cashier/returns",
  "/manager",
  "/manager/orders",
  "/manager/reclamations",
  "/director",
  "/director/orders",
  "/livreur/orders",
  "/livreur/returns",
  "/hub",
] as const;

export function revalidateAppCache(): { revalidated: number } {
  for (const path of APP_PATHS) {
    revalidatePath(path);
  }
  return { revalidated: APP_PATHS.length };
}
