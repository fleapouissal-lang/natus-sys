/** Page caisse POS — sidebar réduite pour maximiser l'espace de vente. */
export function isCashierPosRoute(pathname: string): boolean {
  return pathname === "/cashier/pos" || pathname.startsWith("/cashier/pos/");
}
