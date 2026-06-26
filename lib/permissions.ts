import type { Profile, Store, UserRole } from "@/lib/types";
import { getCustomHomePath, isStoreScopedManager } from "@/lib/user-page-access";

export const MANAGEMENT_ROLES = ["directeur", "admin", "manager"] as const;
export type ManagementRole = (typeof MANAGEMENT_ROLES)[number];

export const STOCK_MANAGEMENT_ROLES = ["directeur", "admin", "hub"] as const;
export const STOCK_READ_ROLES = ["directeur", "admin", "manager", "hub"] as const;

export function isDirector(profile: Pick<Profile, "role">): boolean {
  return profile.role === "directeur" || profile.role === "admin";
}

export function isAdmin(profile: Pick<Profile, "role">): boolean {
  return profile.role === "admin";
}

export function isManager(profile: Pick<Profile, "role">): boolean {
  return profile.role === "manager";
}

export function isHub(profile: Pick<Profile, "role">): boolean {
  return profile.role === "hub";
}

export function isLivreur(profile: Pick<Profile, "role">): boolean {
  return profile.role === "livreur";
}

export function isManagement(profile: Pick<Profile, "role">): boolean {
  return isDirector(profile) || isManager(profile);
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case "directeur":
      return "Directeur";
    case "admin":
      return "Administrateur";
    case "manager":
      return "Gérant";
    case "hub":
      return "Dépôt";
    case "cashier":
      return "Caissier";
    case "livreur":
      return "Livreur";
  }
}

export function getHomePath(
  role: UserRole,
  profile?: Pick<Profile, "access_preset" | "allowed_pages" | "store_id" | "role">
): string {
  const customHome = profile ? getCustomHomePath(profile) : null;
  if (customHome) return customHome;

  if (role === "directeur" || role === "admin") return "/director";
  if (role === "manager") return "/manager";
  if (role === "hub") return "/hub";
  if (role === "livreur") return "/livreur/actualites";
  return "/cashier/pos";
}

export function getManagementBasePath(
  role: UserRole
): "/director" | "/manager" | "/hub" | null {
  if (role === "directeur" || role === "admin") return "/director";
  if (role === "manager") return "/manager";
  if (role === "hub") return "/hub";
  return null;
}

/** Ville accessible : null = toutes (directeur/admin), sinon ville du profil */
export function getCityFilter(profile: Profile): string | null {
  if (isDirector(profile)) return null;
  if (isManager(profile) || isHub(profile)) return profile.city;
  return null;
}

export function filterStoresByProfile<T extends Pick<Store, "city" | "id">>(
  stores: T[],
  profile: Profile
): T[] {
  if (isStoreScopedManager(profile) && profile.store_id) {
    return stores.filter((s) => s.id === profile.store_id);
  }
  const city = getCityFilter(profile);
  if (!city) return stores;
  return stores.filter((s) => s.city === city);
}

/** Magasins retail accessibles au gérant (ville ou magasin assigné, sans dépôt). */
export function filterRetailStoresByProfile<T extends Pick<Store, "city" | "id" | "is_hub">>(
  stores: T[],
  profile: Profile
): T[] {
  return filterStoresByProfile(stores, profile).filter((store) => !store.is_hub);
}

export function canCreateRole(creator: Profile, targetRole: UserRole): boolean {
  if (isDirector(creator)) {
    return (
      targetRole === "manager" ||
      targetRole === "cashier" ||
      targetRole === "livreur" ||
      targetRole === "hub"
    );
  }
  if (isManager(creator)) {
    return targetRole === "cashier";
  }
  return false;
}

export function canCreateStoreInCity(profile: Profile, city: string): boolean {
  if (isDirector(profile)) return true;
  if (isManager(profile)) return profile.city === city;
  return false;
}

/** Création d'un point de vente (réservée au directeur). */
export function canCreateStore(profile: Pick<Profile, "role">): boolean {
  return isDirector(profile);
}

export function canManageStore(
  profile: Profile,
  store: Pick<Store, "city" | "id">
): boolean {
  if (isDirector(profile)) return true;
  if (isManager(profile)) {
    if (isStoreScopedManager(profile) && profile.store_id) {
      return profile.store_id === store.id;
    }
    return profile.city === store.city;
  }
  if (isHub(profile)) return profile.city === store.city;
  return false;
}

/** Peut modifier le stock (directeur : partout, dépôt : dépôts uniquement, gérant : non). */
export function canModifyStock(
  profile: Pick<Profile, "role">,
  store?: Pick<Store, "is_hub"> | null
): boolean {
  if (isDirector(profile)) return true;
  if (isHub(profile)) return Boolean(store?.is_hub);
  return false;
}

/** Peut saisir le stock total (directeur partout ; dépôt : ajout uniquement). */
export function canEditStockTotal(
  profile: Pick<Profile, "role">,
  store?: Pick<Store, "is_hub"> | null
): boolean {
  if (isHub(profile)) return false;
  return canModifyStock(profile, store);
}
