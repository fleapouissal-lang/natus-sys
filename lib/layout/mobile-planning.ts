/** Mobile : caissier connecté → planning seul (compte perso ou terminal magasin) */
export function isMobilePlanningOnlyMode(input: {
  isPersonalCashier?: boolean;
  isStorePos?: boolean;
  hasPosOperator?: boolean;
}): boolean {
  return Boolean(
    input.isPersonalCashier || (input.isStorePos && input.hasPosOperator)
  );
}

/** Mobile compte caisse magasin : pas de barre du bas (gate ou planning caissier) */
export function isMobileStorePosMode(isStorePos?: boolean): boolean {
  return Boolean(isStorePos);
}

/** Mobile compte magasin sans caissier : écran connexion caissier plein page */
export function isMobileStorePosGateMode(input: {
  isStorePos?: boolean;
  hasPosOperator?: boolean;
}): boolean {
  return Boolean(input.isStorePos && !input.hasPosOperator);
}

/** Barre du bas mobile visible (directeur, gérant, hub, caissier standard…) */
export function isMobileBottomNavVisible(input: {
  isStorePos?: boolean;
  isPersonalCashier?: boolean;
  hasPosOperator?: boolean;
}): boolean {
  if (input.isStorePos) return false;
  return !isMobilePlanningOnlyMode(input);
}

export const CASHIER_PLANNING_PATH = "/cashier/planning";
export const CASHIER_POS_PATH = "/cashier/pos";
