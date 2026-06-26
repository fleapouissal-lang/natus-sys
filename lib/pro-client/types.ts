export type ProClientType = "entreprise" | "particulier";

export type ProClientRegistrationStoreResult =
  | { status: "invalid" }
  | {
      status: "open";
      storeName: string;
    };

/** @deprecated Ancien flux session 15 min */
export type ProClientRegistrationSessionResult =
  | { status: "invalid" }
  | {
      status: "open";
      sessionToken: string;
      expiresAt: string;
      storeName: string;
    };

export type ProClientSubmitResult =
  | { status: "invalid" }
  | {
      status: "success";
      customerId: string;
      qrToken: string;
      cardNumber: string;
    };
