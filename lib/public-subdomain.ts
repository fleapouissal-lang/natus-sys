export type PublicSubdomain = "loyalty" | "pro" | "reclamations";

/**
 * Origine publique dédiée à un espace client (sous-domaine).
 *
 * Ex. depuis https://os.natusmarrakech.com :
 *   - "loyalty" → https://loyalty.natusmarrakech.com
 *   - "pro"     → https://pro.natusmarrakech.com
 *
 * En développement (localhost / IP) ou si l'origine est introuvable,
 * l'origine courante est conservée telle quelle.
 */
export function publicSubdomainOrigin(
  subdomain: PublicSubdomain,
  baseUrl?: string
): string {
  const origin =
    baseUrl ||
    (typeof window !== "undefined" ? window.location.origin : "") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "";

  if (!origin) return "";

  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();

    // Dev / IP : pas de découpage en sous-domaine.
    if (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      /^[0-9.]+$/.test(host)
    ) {
      return origin.replace(/\/$/, "");
    }

    const labels = host.split(".");
    const base = labels.length > 2 ? labels.slice(1).join(".") : host;
    const port = url.port ? `:${url.port}` : "";
    return `${url.protocol}//${subdomain}.${base}${port}`;
  } catch {
    return origin.replace(/\/$/, "");
  }
}
