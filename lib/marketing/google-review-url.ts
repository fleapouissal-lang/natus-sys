/** URL Google qui ouvre directement le formulaire « Laisser un avis ». */
export function toDirectGoogleReviewUrl(mapsOrReviewUrl: string): string {
  const url = mapsOrReviewUrl.trim();
  if (!url) return url;

  if (/search\.google\.com\/local\/writereview/i.test(url)) return url;
  if (/g\.page\/r\/[^/]+\/review/i.test(url)) return url;

  const hexPlace = url.match(/!1s(0x[a-f0-9]+:0x[a-f0-9]+)/i)?.[1];
  if (hexPlace) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(hexPlace)}`;
  }

  const chij = url.match(/(ChIJ[A-Za-z0-9_-]{20,})/)?.[1];
  if (chij) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(chij)}`;
  }

  return url;
}
