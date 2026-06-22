import { NATUS_CITIES } from "@/lib/constants/cities";
import { getRoleLabel } from "@/lib/permissions";
import type { Profile, UserRole } from "@/lib/types";
import type { NewsAnnouncement, NewsAudienceType } from "@/lib/news/types";

export const TARGETABLE_ROLES: UserRole[] = [
  "manager",
  "cashier",
  "hub",
  "livreur",
  "directeur",
  "admin",
];

export type AudienceOption = {
  value: NewsAudienceType;
  label: string;
  description: string;
  needsCity?: boolean;
  needsStore?: boolean;
  needsRoles?: boolean;
  directorOnly?: boolean;
};

export const AUDIENCE_OPTIONS: AudienceOption[] = [
  {
    value: "all",
    label: "Toute l'équipe",
    description: "Visible par tous les utilisateurs actifs",
    directorOnly: true,
  },
  {
    value: "city",
    label: "Ville entière",
    description: "Tous les rôles d'une ville",
    needsCity: true,
  },
  {
    value: "managers_city",
    label: "Gérants d'une ville",
    description: "Uniquement les gérants de la ville choisie",
    needsCity: true,
  },
  {
    value: "cashiers_city",
    label: "Caissiers d'une ville",
    description: "Caissiers des magasins de la ville",
    needsCity: true,
  },
  {
    value: "hub_city",
    label: "Compte hub d'une ville",
    description: "Responsable hub stock de la ville",
    needsCity: true,
  },
  {
    value: "livreurs_city",
    label: "Livreurs d'une ville",
    description: "Livreurs rattachés aux magasins de la ville",
    needsCity: true,
  },
  {
    value: "store",
    label: "Magasin précis",
    description: "Équipe d'un magasin (caissiers, livreur)",
    needsStore: true,
  },
  {
    value: "roles",
    label: "Rôles personnalisés",
    description: "Sélection libre des rôles concernés",
    needsRoles: true,
    directorOnly: true,
  },
];

export function getAudienceOptionsForProfile(
  profile: Pick<Profile, "role">
): AudienceOption[] {
  const isDirector = profile.role === "directeur" || profile.role === "admin";
  return AUDIENCE_OPTIONS.filter((opt) => !opt.directorOnly || isDirector);
}

export function getProfileCity(
  profile: Pick<Profile, "city" | "store_id">,
  storeCity: string | null
): string | null {
  if (profile.city) return profile.city;
  return storeCity;
}

export function isAnnouncementVisibleToProfile(
  post: Pick<
    NewsAnnouncement,
    | "audience_type"
    | "target_city"
    | "target_store_id"
    | "target_roles"
    | "created_by"
  >,
  profile: Pick<Profile, "id" | "role" | "city" | "store_id">,
  storeCity: string | null,
  options?: { includeAuthored?: boolean }
): boolean {
  if (options?.includeAuthored && post.created_by === profile.id) return true;

  const city = getProfileCity(profile, storeCity);

  switch (post.audience_type) {
    case "all":
      return true;
    case "city":
      return Boolean(city && post.target_city && city === post.target_city);
    case "managers_city":
      return (
        profile.role === "manager" &&
        Boolean(city && post.target_city && city === post.target_city)
      );
    case "cashiers_city":
      return (
        profile.role === "cashier" &&
        Boolean(city && post.target_city && city === post.target_city)
      );
    case "hub_city":
      return (
        profile.role === "hub" &&
        Boolean(city && post.target_city && city === post.target_city)
      );
    case "livreurs_city":
      return (
        profile.role === "livreur" &&
        Boolean(city && post.target_city && city === post.target_city)
      );
    case "store":
      return Boolean(
        profile.store_id &&
          post.target_store_id &&
          profile.store_id === post.target_store_id
      );
    case "roles":
      return Boolean(
        post.target_roles?.length &&
          post.target_roles.includes(profile.role)
      );
    default:
      return false;
  }
}

export function getAudienceLabel(
  post: Pick<
    NewsAnnouncement,
    "audience_type" | "target_city" | "target_store_id" | "target_roles"
  > & {
    store?: { name: string; city: string } | null;
  }
): string {
  switch (post.audience_type) {
    case "all":
      return "Toute l'équipe";
    case "city":
      return post.target_city ? `Ville · ${post.target_city}` : "Ville";
    case "managers_city":
      return post.target_city
        ? `Gérants · ${post.target_city}`
        : "Gérants";
    case "cashiers_city":
      return post.target_city
        ? `Caissiers · ${post.target_city}`
        : "Caissiers";
    case "hub_city":
      return post.target_city ? `Hub · ${post.target_city}` : "Hub";
    case "livreurs_city":
      return post.target_city
        ? `Livreurs · ${post.target_city}`
        : "Livreurs";
    case "store":
      return post.store?.name
        ? `Magasin · ${post.store.name}`
        : "Magasin";
    case "roles":
      if (!post.target_roles?.length) return "Rôles";
      return post.target_roles.map((r) => getRoleLabel(r)).join(", ");
    default:
      return "Audience";
  }
}

export function isValidAudienceCity(city: string): boolean {
  return (NATUS_CITIES as readonly string[]).includes(city);
}

export function parseTargetRoles(raw: string | null): UserRole[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r): r is UserRole =>
      TARGETABLE_ROLES.includes(r as UserRole)
    );
  } catch {
    return [];
  }
}
