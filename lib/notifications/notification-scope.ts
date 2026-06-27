export type NotificationScope =
  | { mode: "store"; storeId: string }
  | { mode: "city"; city: string }
  | { mode: "director" }
  | { mode: "hub"; city: string; hubStoreId: string };

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
  }
}

export function resolveNotificationScope(input: {
  role: string;
  storeId?: string | null;
  city?: string | null;
  hubStoreId?: string | null;
}): NotificationScope | null {
  if (input.role === "directeur" || input.role === "admin") {
    return { mode: "director" };
  }

  if (input.role === "hub" && input.city && input.hubStoreId) {
    return { mode: "hub", city: input.city, hubStoreId: input.hubStoreId };
  }

  if (input.storeId) {
    return { mode: "store", storeId: input.storeId };
  }

  if (input.role === "manager" && input.city) {
    return { mode: "city", city: input.city };
  }

  return null;
}
