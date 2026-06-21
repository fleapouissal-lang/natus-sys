export function formatTimeAgo(isoDate: string, now = Date.now()): string {
  const t = new Date(isoDate).getTime();
  if (Number.isNaN(t)) return "";
  const diffSec = Math.max(0, Math.floor((now - t) / 1000));
  if (diffSec < 60) return "À l'instant";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  return diffD === 1 ? "Il y a 1 jour" : `Il y a ${diffD} j`;
}
