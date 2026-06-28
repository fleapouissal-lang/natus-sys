import { publicSubdomainOrigin } from "@/lib/public-subdomain";

export function proClientStoreRegistrationUrl(storeToken: string, baseUrl?: string): string {
  const origin = publicSubdomainOrigin("pro", baseUrl);
  return `${origin.replace(/\/$/, "")}/client-pro/inscription-normale/${storeToken}`;
}

/** @deprecated Ancien lien invite temporaire */
export function proClientInviteUrl(token: string, baseUrl?: string): string {
  const origin = publicSubdomainOrigin("pro", baseUrl);
  return `${origin.replace(/\/$/, "")}/client-pro/${token}`;
}
