/** Page caisse POS — sidebar réduite pour maximiser l'espace de vente. */
export function isCashierPosRoute(pathname: string): boolean {
  return pathname.startsWith("/cashier/pos");
}

export function sidebarCollapsedForRoute(pathname: string): boolean {
  return isCashierPosRoute(pathname);
}
