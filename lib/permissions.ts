import type { Profile, Store, UserRole } from "@/lib/types";

export const MANAGEMENT_ROLES = ["directeur", "manager"] as const;
export type ManagementRole = (typeof MANAGEMENT_ROLES)[number];

export function isDirector(profile: Pick<Profile, "role">): boolean {
  return profile.role === "directeur";
}

export function isManager(profile: Pick<Profile, "role">): boolean {
  return profile.role === "manager";
}

export function isManagement(profile: Pick<Profile, "role">): boolean {
  return isDirector(profile) || isManager(profile);
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case "directeur":
      return "Directeur";
    case "manager":
      return "Gérant";
    case "cashier":
      return "Caissier";
  }
}

export function getHomePath(role: UserRole): string {
  if (role === "directeur") return "/director";
  if (role === "manager") return "/manager";
  return "/cashier/pos";
}

export function getManagementBasePath(role: UserRole): "/director" | "/manager" | null {
  if (role === "directeur") return "/director";
  if (role === "manager") return "/manager";
  return null;
}

/** Ville accessible : null = toutes (directeur), sinon ville du gérant */
export function getCityFilter(profile: Profile): string | null {
  if (isDirector(profile)) return null;
  if (isManager(profile)) return profile.city;
  return null;
}

export function filterStoresByProfile<T extends Pick<Store, "city">>(
  stores: T[],
  profile: Profile
): T[] {
  const city = getCityFilter(profile);
  if (!city) return stores;
  return stores.filter((s) => s.city === city);
}

export function canCreateRole(
  creator: Profile,
  targetRole: UserRole
): boolean {
  if (isDirector(creator)) {
    return targetRole === "manager" || targetRole === "cashier";
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

export function canManageStore(profile: Profile, store: Pick<Store, "city">): boolean {
  if (isDirector(profile)) return true;
  if (isManager(profile)) return profile.city === store.city;
  return false;
}
