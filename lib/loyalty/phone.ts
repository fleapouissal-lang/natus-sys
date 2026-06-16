export function normalizePhone(phone: string): string | null {
  const clean = phone.trim().replace(/[^\d+]/g, "");
  if (!clean) return null;

  if (clean.startsWith("0") && clean.length === 10) {
    return `+212${clean.slice(1)}`;
  }
  if (clean.startsWith("212") && !clean.startsWith("+")) {
    return `+${clean}`;
  }
  if (!clean.startsWith("+") && clean.length === 9) {
    return `+212${clean}`;
  }
  if (clean.startsWith("+")) return clean;
  return clean;
}

export function formatPhoneDisplay(phone: string): string {
  const n = normalizePhone(phone) || phone;
  if (n.startsWith("+212") && n.length === 13) {
    return `0${n.slice(4, 6)} ${n.slice(6, 8)} ${n.slice(8, 10)} ${n.slice(10, 12)} ${n.slice(12)}`;
  }
  return n;
}
