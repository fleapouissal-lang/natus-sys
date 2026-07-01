import type { UserRole } from "@/lib/types";

export function getSettingsPath(role: UserRole): string {
  switch (role) {
    case "directeur":
    case "admin":
    case "responsable_financier":
      return "/director/settings";
    case "manager":
      return "/manager/settings";
    case "hub":
      return "/hub/settings";
    case "livreur":
      return "/livreur/settings";
    default:
      return "/cashier/settings";
  }
}
