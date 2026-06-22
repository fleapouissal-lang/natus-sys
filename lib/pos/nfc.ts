const NFC_PREFIX = "NATUS-NFC:";

export function normalizeNfcUid(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const withoutPrefix = trimmed.toUpperCase().startsWith(NFC_PREFIX)
    ? trimmed.slice(NFC_PREFIX.length)
    : trimmed;
  return withoutPrefix.trim().toUpperCase().replace(/\s+/g, "");
}

export function formatNfcScanPayload(uid: string): string {
  return `${NFC_PREFIX}${normalizeNfcUid(uid)}`;
}

export function isLikelyNfcScan(code: string): boolean {
  const normalized = code.trim().toUpperCase();
  return (
    normalized.startsWith(NFC_PREFIX) ||
    /^[0-9A-F:.-]{8,}$/.test(normalized.replace(/\s/g, ""))
  );
}
