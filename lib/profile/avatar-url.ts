/** Sert les fichiers Supabase Storage via le proxy same-origin. */
export function proxySupabaseStorageUrl(url: string): string {
  const trimmed = url.trim();
  const marker = "/storage/v1/object/public/";
  const index = trimmed.indexOf(marker);
  if (index === -1) return trimmed;

  const path = trimmed.slice(index + marker.length).replace(/^\/+/, "");
  if (!path) return trimmed;

  return `/api/product-image/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export function resolveAvatarDisplayUrl(avatarUrl?: string | null): string | null {
  if (!avatarUrl?.trim()) return null;

  const url = avatarUrl.trim();

  if (url.startsWith("/api/product-image/")) return url;

  if (url.startsWith("data:") || url.startsWith("blob:")) return url;

  if (url.startsWith("profile-avatars/")) {
    return `/api/product-image/${url.split("/").map(encodeURIComponent).join("/")}`;
  }

  if (url.startsWith("/storage/v1/object/public/")) {
    return proxySupabaseStorageUrl(url);
  }

  if (
    url.includes("supabase.co/storage/") ||
    url.includes("supabase.in/storage/") ||
    url.includes("/storage/v1/object/public/")
  ) {
    return proxySupabaseStorageUrl(url);
  }

  if (url.startsWith("/") && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
    return resolveAvatarDisplayUrl(`${base}${url}`);
  }

  return url;
}
