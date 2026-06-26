"use client";

import type { LoyaltyCustomer, LoyaltySettings } from "@/lib/types";
import type { PublicLoyaltyTransaction } from "@/lib/loyalty/public";
import { LoyaltyCardPortal } from "@/components/loyalty/loyalty-card-portal";
import { DEFAULT_LOYALTY_SETTINGS } from "@/lib/loyalty/config";

export function LoyaltyCardClientView({
  initialCustomer,
  initialTransactions,
  loyaltySettings = DEFAULT_LOYALTY_SETTINGS,
}: {
  initialCustomer: LoyaltyCustomer;
  initialTransactions: PublicLoyaltyTransaction[];
  loyaltySettings?: LoyaltySettings;
}) {
  return (
    <LoyaltyCardPortal
      initialCustomer={initialCustomer}
      initialTransactions={initialTransactions}
      loyaltySettings={loyaltySettings}
    />
  );
}

export { LoyaltyCardShareForCashier, LoyaltyCardQrForCashier } from "@/components/loyalty/loyalty-card-cashier-share";
