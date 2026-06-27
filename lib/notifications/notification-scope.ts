export type NotificationScope =
  | { mode: "store"; storeId: string }
  | { mode: "city"; city: string }
  | { mode: "director" }
  | { mode: "hub"; city: string; hubStoreId: string }
  | { mode: "livreur"; livreurId: string; city: string };

export function notificationStorageKey(scope: NotificationScope): string {
  switch (scope.mode) {
    case "store":
      return `store-${scope.storeId}`;
    case "city":
      return `city-${scope.city}`;
    case "director":
      return "director-all";
    case "hub":
      return `hub-${scope.hubStoreId}`;
    case "livreur":
      return `livreur-${scope.livreurId}`;
  }
}

export function notificationChannelId(scope: NotificationScope): string {
  switch (scope.mode) {
    case "store":
      return `store-${scope.storeId}`;
    case "city":
      return `city-${scope.city}`;
    case "director":
      return "director-all";
    case "hub":
      return `hub-${scope.hubStoreId}`;
    case "livreur":
      return `livreur-${scope.livreurId}`;
  }
}

export function resolveNotificationScope(input: {
  role: string;
  storeId?: string | null;
  city?: string | null;
  hubStoreId?: string | null;
  livreurId?: string | null;
}): NotificationScope | null {
  if (input.role === "directeur" || input.role === "admin") {
    return { mode: "director" };
  }

  if (input.role === "hub" && input.city && input.hubStoreId) {
    return { mode: "hub", city: input.city, hubStoreId: input.hubStoreId };
  }

  if (input.role === "livreur" && input.city && input.livreurId) {
    return { mode: "livreur", livreurId: input.livreurId, city: input.city };
  }

  if (input.storeId) {
    return { mode: "store", storeId: input.storeId };
  }

  if (input.role === "manager" && input.city) {
    return { mode: "city", city: input.city };
  }

  return null;
}
