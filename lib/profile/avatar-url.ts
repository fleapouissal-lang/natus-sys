export function proxySupabaseStorageUrl(url: string): string {
  const marker = "/storage/v1/object/public/";
  const index = url.indexOf(marker);
  if (index === -1) return url;

  const path = url.slice(index + marker.length).replace(/^\/+/, "");
  if (!path) return url;

  return `/api/product-image/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export function resolveAvatarDisplayUrl(avatarUrl?: string | null): string | null {
  if (!avatarUrl?.trim()) return null;
  const url = avatarUrl.trim();
  if (url.includes("supabase.co/storage/v1/object/public/")) {
    return proxySupabaseStorageUrl(url);
  }
  return url;
}
