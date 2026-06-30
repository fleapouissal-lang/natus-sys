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
