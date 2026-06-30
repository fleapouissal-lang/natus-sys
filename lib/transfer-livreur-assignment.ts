import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";

/** Ville où le livreur récupère le colis (= magasin / dépôt source). */
export function pickupCityForTransferLivreur(input: {
  from_store_city?: string | null;
}): string | null {
  const city = input.from_store_city?.trim();
  return city || null;
}

export function filterLivreursForPickupCity(
  livreurs: Profile[],
  pickupCity: string | null
): Profile[] {
  if (!pickupCity) return livreurs;
  return livreurs.filter((livreur) => livreur.city === pickupCity);
}

export function mapLivreurSelectOptions(livreurs: Profile[]) {
  return livreurs.map((livreur) => ({
    value: livreur.id,
    label: livreur.full_name || livreur.email,
  }));
}

export type TransferWithAssignedLivreur = {
  assigned_livreur_id: string | null;
  assigned_livreur_name?: string | null;
};

/** Résout le nom affiché (jointure Supabase ou liste livreurs locale). */
export function resolveTransferLivreurName(
  transfer: TransferWithAssignedLivreur,
  livreurs: Pick<Profile, "id" | "full_name" | "email">[] = []
): string | null {
  const fromJoin = transfer.assigned_livreur_name?.trim();
  if (fromJoin) return fromJoin;
  if (!transfer.assigned_livreur_id) return null;
  const match = livreurs.find((livreur) => livreur.id === transfer.assigned_livreur_id);
  return match?.full_name?.trim() || match?.email?.trim() || null;
}

/** Complète assigned_livreur_name quand la jointure profiles est bloquée par RLS. */
export async function enrichTransferLivreurNames<T extends TransferWithAssignedLivreur>(
  transfers: T[]
): Promise<T[]> {
  const missingIds = new Set<string>();
  for (const transfer of transfers) {
    if (transfer.assigned_livreur_id && !transfer.assigned_livreur_name?.trim()) {
      missingIds.add(transfer.assigned_livreur_id);
    }
  }
  if (missingIds.size === 0) return transfers;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .in("id", [...missingIds]);

  if (error || !data?.length) return transfers;

  const byId = new Map(
    data.map((profile) => [
      profile.id as string,
      (profile.full_name as string | null)?.trim() ||
        (profile.email as string)?.trim() ||
        null,
    ])
  );

  return transfers.map((transfer) => ({
    ...transfer,
    assigned_livreur_name:
      transfer.assigned_livreur_name?.trim() ||
      (transfer.assigned_livreur_id
        ? byId.get(transfer.assigned_livreur_id) ?? null
        : null),
  }));
}
