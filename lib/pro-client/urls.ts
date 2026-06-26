export function proClientStoreRegistrationUrl(storeToken: string, baseUrl?: string): string {
  const origin =
    baseUrl ||
    (typeof window !== "undefined" ? window.location.origin : "") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "";
  return `${origin.replace(/\/$/, "")}/client-pro/inscription-normale/${storeToken}`;
}

/** @deprecated Ancien lien invite temporaire */
export function proClientInviteUrl(token: string, baseUrl?: string): string {
  const origin =
    baseUrl ||
    (typeof window !== "undefined" ? window.location.origin : "") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "";
  return `${origin.replace(/\/$/, "")}/client-pro/${token}`;
}
