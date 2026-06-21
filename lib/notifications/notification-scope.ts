export type NotificationScope =
  | { mode: "store"; storeId: string }
  | { mode: "city"; city: string };

export function notificationStorageKey(scope: NotificationScope): string {
  return scope.mode === "store"
    ? `store-${scope.storeId}`
    : `city-${scope.city}`;
}

export function notificationChannelId(scope: NotificationScope): string {
  return scope.mode === "store"
    ? `store-${scope.storeId}`
    : `city-${scope.city}`;
}
