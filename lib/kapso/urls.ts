export function appPublicOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "") ||
    ""
  );
}

export function shopifyOrderTrackingPublicUrl(trackingToken: string, baseUrl?: string): string {
  const origin = baseUrl || appPublicOrigin();
  return `${origin.replace(/\/$/, "")}/commande/${trackingToken}`;
}

export function shopifyOrderConfirmPublicUrl(trackingToken: string, baseUrl?: string): string {
  const origin = baseUrl || appPublicOrigin();
  return `${origin.replace(/\/$/, "")}/commande/${trackingToken}/confirmer`;
}
