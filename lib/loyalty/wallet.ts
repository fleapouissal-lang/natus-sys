/**
 * Architecture Wallet mobile (Apple / Google) — intégration future.
 * Les colonnes apple_wallet_pass_id et google_wallet_pass_id sur `customers`
 * stockeront les identifiants de pass une fois les APIs configurées.
 */

export interface WalletPassPayload {
  customerId: string;
  cardNumber: string;
  fullName: string;
  points: number;
  qrToken: string;
  publicUrl: string;
}

export interface WalletProviderConfig {
  apple: {
    passTypeIdentifier: string;
    teamIdentifier: string;
    enabled: boolean;
  };
  google: {
    issuerId: string;
    classId: string;
    enabled: boolean;
  };
}

export function getWalletProviderConfig(): WalletProviderConfig {
  return {
    apple: {
      passTypeIdentifier: process.env.APPLE_WALLET_PASS_TYPE_ID || "",
      teamIdentifier: process.env.APPLE_WALLET_TEAM_ID || "",
      enabled: Boolean(
        process.env.APPLE_WALLET_PASS_TYPE_ID && process.env.APPLE_WALLET_TEAM_ID
      ),
    },
    google: {
      issuerId: process.env.GOOGLE_WALLET_ISSUER_ID || "",
      classId: process.env.GOOGLE_WALLET_CLASS_ID || "",
      enabled: Boolean(
        process.env.GOOGLE_WALLET_ISSUER_ID && process.env.GOOGLE_WALLET_CLASS_ID
      ),
    },
  };
}

export function buildWalletPassPayload(
  customer: {
    id: string;
    card_number: string;
    full_name: string;
    loyalty_points: number;
    qr_token: string;
  },
  publicUrl: string
): WalletPassPayload {
  return {
    customerId: customer.id,
    cardNumber: customer.card_number,
    fullName: customer.full_name,
    points: customer.loyalty_points,
    qrToken: customer.qr_token,
    publicUrl,
  };
}
