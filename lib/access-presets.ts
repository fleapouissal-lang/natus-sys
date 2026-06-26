import {
  filterNavLinksByPages,
  getCustomHomePath,
  hasCustomPageAccess,
  isRouteAllowedForProfile,
  isStoreScopedManager,
  summarizePageAccess,
} from "@/lib/user-page-access";

/** @deprecated Préférez lib/user-page-access.ts */
export {
  filterNavLinksByPages as filterNavLinksByPreset,
  getCustomHomePath as getPresetHomePath,
  hasCustomPageAccess,
  isRouteAllowedForProfile,
  isStoreScopedManager,
  summarizePageAccess,
};

export type AccessPreset = "full" | "store_planning_stock" | "store_planning_pos_sales";

export function normalizeAccessPreset(value: string | null | undefined): AccessPreset {
  if (value === "store_planning_stock" || value === "store_planning_pos_sales") {
    return value;
  }
  return "full";
}

export function getAccessPresetLabel(
  profile: Parameters<typeof summarizePageAccess>[0]
): string {
  return summarizePageAccess(profile);
}
